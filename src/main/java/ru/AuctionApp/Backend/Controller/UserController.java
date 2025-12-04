package ru.AuctionApp.Backend.Controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.AuctionApp.Backend.Entity.User;
import ru.AuctionApp.Backend.Repositories.UsersRepository;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UsersRepository usersRepository;

    /**
     * Получает список всех пользователей (доступно только администраторам)
     * Возвращает полные данные, включая пароли
     *
     * @param session HTTP сессия для проверки авторизации
     * @return ResponseEntity со списком пользователей или сообщением об ошибке
     */
    @GetMapping("/all")
    public ResponseEntity<?> getAllUsers(HttpSession session) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }

            User currentUser = usersRepository.findById(userId).orElse(null);
            if (currentUser == null || !"admin".equals(currentUser.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Доступ запрещен. Только администраторы могут просматривать всех пользователей"));
            }

            List<User> users = usersRepository.findAllByOrderById();
            List<Map<String, Object>> usersWithPasswords = new ArrayList<>();

            for (User user : users) {
                Map<String, Object> userData = convertUserToMap(user);
                usersWithPasswords.add(userData);
            }

            return ResponseEntity.ok(usersWithPasswords);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка сервера при получении пользователей"));
        }
    }

    /**
     * Получает данные конкретного пользователя по ID
     *
     * @param id ID пользователя
     * @return ResponseEntity с данными пользователя или сообщением об ошибке
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        try {
            User user = usersRepository.findById(id).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Пользователь не найден"));
            }

            return ResponseEntity.ok(convertUserToMap(user));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка сервера"));
        }
    }

    /**
     * Обновляет данные пользователя (для обычных пользователей)
     * Разрешает обновление только ограниченного набора полей
     *
     * @param id ID пользователя
     * @param updates Map с обновляемыми данными
     * @param session HTTP сессия для проверки авторизации
     * @return ResponseEntity с обновленными данными или сообщением об ошибке
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates,
            HttpSession session
    ) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null || !userId.equals(id)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Нет доступа к обновлению данных этого пользователя"));
            }

            User user = usersRepository.findById(id).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Пользователь не найден"));
            }

            if (updates.containsKey("fullName")) {
                user.setFullName((String) updates.get("fullName"));
            }

            if (updates.containsKey("email")) {
                String newEmail = (String) updates.get("email");
                User existingUser = usersRepository.findByEmail(newEmail);
                if (existingUser != null && !existingUser.getId().equals(id)) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(Map.of("error", "Email уже используется другим пользователем"));
                }
                user.setEmail(newEmail);
            }

            if (updates.containsKey("birthDate")) {
                user.setBirthDate((String) updates.get("birthDate"));
            }

            usersRepository.save(user);

            return ResponseEntity.ok(convertUserToMap(user));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка при обновлении данных пользователя"));
        }
    }

    /**
     * Загружает или обновляет аватар пользователя
     *
     * @param id ID пользователя
     * @param avatar файл изображения для загрузки
     * @param session HTTP сессия для проверки авторизации
     * @return ResponseEntity с URL нового аватара или сообщением об ошибке
     */
    @PostMapping("/{id}/avatar")
    public ResponseEntity<?> uploadAvatar(
            @PathVariable Long id,
            @RequestParam(value = "avatar", required = false) MultipartFile avatar,
            HttpSession session
    ) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null || !userId.equals(id)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Нет доступа"));
            }

            User user = usersRepository.findById(id).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Пользователь не найден"));
            }

            if (avatar == null || avatar.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Файл не был загружен"));
            }

            if (!avatar.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Загружаемый файл должен быть изображением"));
            }

            String originalFilename = avatar.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String fileName = UUID.randomUUID().toString() + fileExtension;

            Path uploadPath = Paths.get("uploads/avatars");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            Path filePath = uploadPath.resolve(fileName);
            Files.copy(avatar.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            user.setAvatarPath("/uploads/avatars/" + fileName);
            usersRepository.save(user);

            return ResponseEntity.ok(Map.of(
                    "avatarUrl", user.getAvatarPath(),
                    "message", "Аватар успешно обновлен"
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка при загрузке аватара: " + e.getMessage()));
        }
    }

    /**
     * Обновляет данные пользователя с правами администратора
     * Позволяет изменять все поля, включая пароль и роль
     *
     * @param id ID пользователя для обновления
     * @param updates Map с обновляемыми данными
     * @param session HTTP сессия для проверки прав администратора
     * @return ResponseEntity с обновленными данными пользователя или сообщением об ошибке
     */
    @PutMapping("/{id}/admin-update")
    public ResponseEntity<?> adminUpdateUser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates,
            HttpSession session
    ) {
        try {
            Long adminId = (Long) session.getAttribute("userId");
            if (adminId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }

            User admin = usersRepository.findById(adminId).orElse(null);
            if (admin == null || !"admin".equals(admin.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Доступ запрещен. Только администраторы могут обновлять пользователей"));
            }

            User user = usersRepository.findById(id).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Пользователь не найден"));
            }

            if (updates.containsKey("fullName")) {
                String fullName = (String) updates.get("fullName");
                if (fullName != null && !fullName.trim().isEmpty()) {
                    user.setFullName(fullName.trim());
                }
            }

            if (updates.containsKey("email")) {
                String newEmail = (String) updates.get("email");
                if (newEmail != null && !newEmail.trim().isEmpty()) {
                    if (!newEmail.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(Map.of("error", "Некорректный формат email"));
                    }

                    User existingUser = usersRepository.findByEmail(newEmail);
                    if (existingUser != null && !existingUser.getId().equals(id)) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(Map.of("error", "Email уже используется другим пользователем"));
                    }
                    user.setEmail(newEmail.trim());
                }
            }

            if (updates.containsKey("password")) {
                String password = (String) updates.get("password");
                if (password != null && !password.trim().isEmpty()) {
                    user.setPassword(password.trim());
                }
            }

            if (updates.containsKey("birthDate")) {
                String birthDate = (String) updates.get("birthDate");
                user.setBirthDate(birthDate != null ? birthDate.trim() : null);
            }

            if (updates.containsKey("role")) {
                String newRole = (String) updates.get("role");
                if (newRole != null && !newRole.trim().isEmpty()) {
                    user.setRole(newRole);
                }
            }

            if (updates.containsKey("bannedStatus")) {
                Object bannedStatusObj = updates.get("bannedStatus");
                boolean banned = false;
                if (bannedStatusObj instanceof Boolean) {
                    banned = (Boolean) bannedStatusObj;
                } else if (bannedStatusObj != null) {
                    banned = Boolean.parseBoolean(bannedStatusObj.toString());
                }
                user.setBannedStatus(banned);
            }

            if (updates.containsKey("visits")) {
                Object visitsObj = updates.get("visits");
                int visits = 0;
                if (visitsObj instanceof Integer) {
                    visits = (Integer) visitsObj;
                } else if (visitsObj != null) {
                    try {
                        visits = Integer.parseInt(visitsObj.toString());
                    } catch (NumberFormatException e) {
                    }
                }
                user.setVisits(visits);
            }

            usersRepository.save(user);
            Map<String, Object> updatedUser = convertUserToMap(user);

            return ResponseEntity.ok(updatedUser);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка при обновлении пользователя: " + e.getMessage()));
        }
    }

    /**
     * Блокирует или разблокирует пользователя
     *
     * @param id ID пользователя для блокировки/разблокировки
     * @param request Map с ключом "banned" (true/false)
     * @param session HTTP сессия для проверки прав администратора
     * @return ResponseEntity с обновленными данными или сообщением об ошибке
     */
    @PostMapping("/{id}/ban")
    public ResponseEntity<?> toggleBan(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> request,
            HttpSession session
    ) {
        try {
            Long adminId = (Long) session.getAttribute("userId");
            if (adminId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }

            User admin = usersRepository.findById(adminId).orElse(null);
            if (admin == null || !"admin".equals(admin.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Доступ запрещен. Только администраторы могут блокировать пользователей"));
            }

            User user = usersRepository.findById(id).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Пользователь не найден"));
            }

            if (user.getId().equals(adminId)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Нельзя заблокировать самого себя"));
            }

            Boolean banned = request.get("banned");
            if (banned != null) {
                user.setBannedStatus(banned);
                usersRepository.save(user);

                Map<String, Object> response = convertUserToMap(user);
                response.put("message", banned ? "Пользователь заблокирован" : "Пользователь разблокирован");

                return ResponseEntity.ok(response);
            }

            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Не указан статус блокировки"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка при изменении статуса пользователя"));
        }
    }

    /**
     * Удаляет пользователя (только для администраторов)
     *
     * @param id ID пользователя для удаления
     * @param session HTTP сессия для проверки прав администратора
     * @return ResponseEntity с сообщением об успешном удалении или ошибке
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(
            @PathVariable Long id,
            HttpSession session
    ) {
        try {
            Long adminId = (Long) session.getAttribute("userId");
            if (adminId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }

            User admin = usersRepository.findById(adminId).orElse(null);
            if (admin == null || !"admin".equals(admin.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Доступ запрещен. Только администраторы могут удалять пользователей"));
            }

            if (id.equals(adminId)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Нельзя удалить самого себя"));
            }

            User user = usersRepository.findById(id).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Пользователь не найден"));
            }

            usersRepository.delete(user);

            return ResponseEntity.ok(Map.of("message", "Пользователь успешно удален"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка при удалении пользователя"));
        }
    }

    /**
     * Получает список ставок пользователя (заглушка)
     *
     * @param id ID пользователя
     * @return ResponseEntity с пустым списком (требует реализации)
     */
    @GetMapping("/{id}/bids")
    public ResponseEntity<?> getUserBids(@PathVariable Long id) {
        return ResponseEntity.ok(Collections.emptyList());
    }

    /**
     * Получает список выигранных лотов пользователя (заглушка)
     *
     * @param id ID пользователя
     * @return ResponseEntity с пустым списком (требует реализации)
     */
    @GetMapping("/{id}/won-lots")
    public ResponseEntity<?> getWonLots(@PathVariable Long id) {
        return ResponseEntity.ok(Collections.emptyList());
    }

    /**
     * Преобразует объект User в Map для сериализации
     * @param user объект пользователя для преобразования
     * @return Map с данными пользователя
     */
    private Map<String, Object> convertUserToMap(User user) {
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getId());
        userData.put("fullName", user.getFullName());
        userData.put("email", user.getEmail());
        userData.put("birthDate", user.getBirthDate());
        userData.put("visits", user.getVisits());
        userData.put("role", user.getRole());
        userData.put("avatarPath", user.getAvatarPath());
        userData.put("bannedStatus", user.isBannedStatus());
        userData.put("password", user.getPassword());
        return userData;
    }

    /**
     * Создает нового пользователя (доступно только администраторам)
     *
     * @param userData Map с данными нового пользователя
     * @param session HTTP сессия для проверки прав администратора
     * @return ResponseEntity с созданным пользователем или сообщением об ошибке
     */
    @PostMapping("/create")
    public ResponseEntity<?> createUser(
            @RequestBody Map<String, Object> userData,
            HttpSession session
    ) {
        try {
            Long adminId = (Long) session.getAttribute("userId");
            if (adminId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }

            User admin = usersRepository.findById(adminId).orElse(null);
            if (admin == null || !"admin".equals(admin.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Доступ запрещен. Только администраторы могут создавать пользователей"));
            }

            // Валидация обязательных полей
            if (!userData.containsKey("fullName") || !userData.containsKey("email") || !userData.containsKey("password")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Необходимо указать имя, email и пароль"));
            }

            String fullName = (String) userData.get("fullName");
            String email = (String) userData.get("email");
            String password = (String) userData.get("password");
            String birthDate = (String) userData.get("birthDate");
            String role = (String) userData.get("role");

            if (role == null) {
                role = "user"; // По умолчанию создаем обычного пользователя
            }

            if (fullName == null || fullName.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Имя пользователя не может быть пустым"));
            }

            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Email не может быть пустым"));
            }

            if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Некорректный формат email"));
            }

            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Пароль не может быть пустым"));
            }

            if (password.trim().length() < 6) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Пароль должен содержать минимум 6 символов"));
            }

            // Проверка на существование email
            if (usersRepository.existsByEmail(email)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "Пользователь с таким email уже существует"));
            }

            // Создаем нового пользователя
            User newUser = new User();
            newUser.setFullName(fullName.trim());
            newUser.setEmail(email.trim());
            newUser.setPassword(password.trim());
            newUser.setBirthDate(birthDate != null ? birthDate.trim() : null);
            newUser.setRole(role);
            newUser.setVisits(0);
            newUser.setBannedStatus(false);
            newUser.setAvatarPath("/uploads/avatars/img.png"); // Дефолтная аватарка

            // Обработка статуса блокировки, если указан
            if (userData.containsKey("bannedStatus")) {
                Object bannedStatusObj = userData.get("bannedStatus");
                boolean banned = false;
                if (bannedStatusObj instanceof Boolean) {
                    banned = (Boolean) bannedStatusObj;
                } else if (bannedStatusObj != null) {
                    banned = Boolean.parseBoolean(bannedStatusObj.toString());
                }
                newUser.setBannedStatus(banned);
            }

            usersRepository.save(newUser);

            Map<String, Object> response = convertUserToMap(newUser);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка при создании пользователя: " + e.getMessage()));
        }
    }


    /**
     * Создает нового пользователя с возможностью загрузки аватарки
     *
     * @param email Email пользователя
     * @param fullName Полное имя пользователя
     * @param birthDate Дата рождения (необязательно)
     * @param password Пароль
     * @param avatar Файл аватарки (необязательно)
     * @param role Роль пользователя
     * @param bannedStatus Статус блокировки
     * @param session HTTP сессия для проверки прав администратора
     * @return ResponseEntity с созданным пользователем или сообщением об ошибке
     */
    @PostMapping(value = "/create-with-avatar")
    public ResponseEntity<?> createUserWithAvatar(
            @RequestParam("email") String email,
            @RequestParam("fullName") String fullName,
            @RequestParam(value = "birthDate", required = false) String birthDate,
            @RequestParam("password") String password,
            @RequestParam(value = "avatar", required = false) MultipartFile avatar,
            @RequestParam(value = "role", defaultValue = "user") String role,
            @RequestParam(value = "bannedStatus", defaultValue = "false") boolean bannedStatus,
            HttpSession session
    ) {
        try {
            Long adminId = (Long) session.getAttribute("userId");
            if (adminId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }

            User admin = usersRepository.findById(adminId).orElse(null);
            if (admin == null || !"admin".equals(admin.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Доступ запрещен. Только администраторы могут создавать пользователей"));
            }

            // Валидация обязательных полей
            if (fullName == null || fullName.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Имя пользователя не может быть пустым"));
            }

            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Email не может быть пустым"));
            }

            if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Некорректный формат email"));
            }

            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Пароль не может быть пустым"));
            }

            if (password.trim().length() < 6) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Пароль должен содержать минимум 6 символов"));
            }

            // Проверка на существование email
            if (usersRepository.existsByEmail(email)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "Пользователь с таким email уже существует"));
            }

            // Создаем нового пользователя
            User newUser = new User();
            newUser.setFullName(fullName.trim());
            newUser.setEmail(email.trim());
            newUser.setPassword(password.trim());
            newUser.setBirthDate(birthDate != null ? birthDate.trim() : null);
            newUser.setRole(role);
            newUser.setVisits(0);
            newUser.setBannedStatus(bannedStatus);

            // Устанавливаем дефолтную аватарку
            newUser.setAvatarPath("/uploads/avatars/img.png");

            // Обработка загрузки аватарки (если файл предоставлен и не пустой)
            if (avatar != null && !avatar.isEmpty() && avatar.getOriginalFilename() != null &&
                    !avatar.getOriginalFilename().isEmpty()) {
                try {
                    // Проверяем, что это изображение
                    if (avatar.getContentType() != null && avatar.getContentType().startsWith("image/")) {
                        String originalFilename = avatar.getOriginalFilename();
                        String fileExtension = "";
                        if (originalFilename.contains(".")) {
                            fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
                        }
                        String fileName = UUID.randomUUID().toString() + fileExtension;

                        Path uploadPath = Paths.get("uploads/avatars");
                        if (!Files.exists(uploadPath)) {
                            Files.createDirectories(uploadPath);
                        }

                        Path filePath = uploadPath.resolve(fileName);
                        Files.copy(avatar.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

                        newUser.setAvatarPath("/uploads/avatars/" + fileName);
                    } else {
                        // Если загруженный файл не является изображением, используем дефолтную аватарку
                        newUser.setAvatarPath("/uploads/avatars/img.png");
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    // При ошибке загрузки используем дефолтную аватарку
                    newUser.setAvatarPath("/uploads/avatars/img.png");
                }
            }

            usersRepository.save(newUser);

            Map<String, Object> response = convertUserToMap(newUser);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка при создании пользователя: " + e.getMessage()));
        }
    }

}
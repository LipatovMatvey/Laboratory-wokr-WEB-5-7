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

    // Получение всех пользователей (только для админа) - ВОЗВРАЩАЕМ ПАРОЛИ
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

            // Преобразуем пользователей в Map, чтобы вернуть все данные, включая пароль
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

    // Получение данных конкретного пользователя
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

    // Обновление данных пользователя
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

            // Обновляем только разрешенные поля
            if (updates.containsKey("fullName")) {
                user.setFullName((String) updates.get("fullName"));
            }
            if (updates.containsKey("email")) {
                String newEmail = (String) updates.get("email");
                // Проверяем, не занят ли email другим пользователем
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

    // Загрузка аватара
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

            // Проверяем наличие файла
            if (avatar == null || avatar.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Файл не был загружен"));
            }

            if (!avatar.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Загружаемый файл должен быть изображением"));
            }

            // Создаем уникальное имя файла
            String originalFilename = avatar.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String fileName = UUID.randomUUID().toString() + fileExtension;

            // Создаем директорию если не существует
            Path uploadPath = Paths.get("uploads/avatars");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Сохраняем файл
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(avatar.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Сохраняем путь к файлу в базе данных
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

    // Обновление пользователя админом
    @PutMapping("/{id}/admin-update")
    public ResponseEntity<?> adminUpdateUser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates,
            HttpSession session
    ) {
        try {
            System.out.println("=== ADMIN UPDATE REQUEST ===");
            System.out.println("User ID to update: " + id);
            System.out.println("Updates received: " + updates);

            Long adminId = (Long) session.getAttribute("userId");
            System.out.println("Admin ID from session: " + adminId);

            if (adminId == null) {
                System.out.println("ERROR: Not authenticated");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }

            User admin = usersRepository.findById(adminId).orElse(null);
            if (admin == null || !"admin".equals(admin.getRole())) {
                System.out.println("ERROR: User is not admin or not found");
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Доступ запрещен. Только администраторы могут обновлять пользователей"));
            }

            User user = usersRepository.findById(id).orElse(null);
            if (user == null) {
                System.out.println("ERROR: User to update not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Пользователь не найден"));
            }

            System.out.println("Original user data:");
            System.out.println("FullName: " + user.getFullName());
            System.out.println("Email: " + user.getEmail());
            System.out.println("Role: " + user.getRole());

            // Обновляем поля
            if (updates.containsKey("fullName")) {
                String fullName = (String) updates.get("fullName");
                if (fullName != null && !fullName.trim().isEmpty()) {
                    user.setFullName(fullName.trim());
                    System.out.println("Updating fullName to: " + fullName);
                }
            }

            if (updates.containsKey("email")) {
                String newEmail = (String) updates.get("email");
                if (newEmail != null && !newEmail.trim().isEmpty()) {
                    System.out.println("Updating email to: " + newEmail);

                    // Проверяем email на валидность
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
                    System.out.println("Updating password (length: " + password.length() + ")");
                    user.setPassword(password.trim());
                }
            }

            if (updates.containsKey("birthDate")) {
                String birthDate = (String) updates.get("birthDate");
                System.out.println("Updating birthDate to: " + birthDate);
                user.setBirthDate(birthDate != null ? birthDate.trim() : null);
            }

            if (updates.containsKey("role")) {
                String newRole = (String) updates.get("role");
                if (newRole != null && !newRole.trim().isEmpty()) {
                    System.out.println("Updating role to: " + newRole);
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
                System.out.println("Updating bannedStatus to: " + banned);
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
                        // Оставляем текущее значение
                    }
                }
                System.out.println("Updating visits to: " + visits);
                user.setVisits(visits);
            }

            usersRepository.save(user);
            System.out.println("User saved successfully");

            // Возвращаем обновленного пользователя
            Map<String, Object> updatedUser = convertUserToMap(user);
            System.out.println("Returning updated user: " + updatedUser);

            return ResponseEntity.ok(updatedUser);

        } catch (Exception e) {
            System.err.println("ERROR in adminUpdateUser: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка при обновлении пользователя: " + e.getMessage()));
        }
    }

    // Блокировка/разблокировка пользователя (ПРОСТОЙ МЕТОД)
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

            // Нельзя блокировать самого себя
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

    // Удаление пользователя
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

            // Нельзя удалить самого себя
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

    // Получение ставок пользователя (заглушка)
    @GetMapping("/{id}/bids")
    public ResponseEntity<?> getUserBids(@PathVariable Long id) {
        // Это заглушка - в реальном приложении нужно реализовать получение ставок
        return ResponseEntity.ok(Collections.emptyList());
    }

    // Получение выигранных лотов пользователя (заглушка)
    @GetMapping("/{id}/won-lots")
    public ResponseEntity<?> getWonLots(@PathVariable Long id) {
        // Это заглушка - в реальном приложении нужно реализовать получение выигранных лотов
        return ResponseEntity.ok(Collections.emptyList());
    }

    // Вспомогательный метод для преобразования User в Map
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
        userData.put("password", user.getPassword()); // ВОЗВРАЩАЕМ ПАРОЛЬ
        return userData;
    }
}
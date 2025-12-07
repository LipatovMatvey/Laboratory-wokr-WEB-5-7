package ru.AuctionApp.Backend.Services;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import ru.AuctionApp.Backend.DTO.UserDTO;
import ru.AuctionApp.Backend.Entity.User;
import ru.AuctionApp.Backend.Exception.BannedStatusException;
import ru.AuctionApp.Backend.Exception.InvalidPasswordException;
import ru.AuctionApp.Backend.Exception.UserAlreadyExistsException;
import ru.AuctionApp.Backend.Exception.UserNotFoundException;
import ru.AuctionApp.Backend.Repositories.UsersRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Сервис аутентификации и регистрации пользователей.
 * Реализует бизнес-логику:
 *  - регистрацию нового пользователя;
 *  - вход по email + password;
 *  - определение текущего авторизованного пользователя (whoAmI);
 *  - первичную установку роли;
 *  - работу с аватаром (загрузка, сохранение пути);
 *  - управление сессией.
 */
@Service
public class AuthService {

    /**
     *
     */
    @Autowired
    private UsersRepository userRepository;

    /**
     * Регистрирует нового пользователя.
     *
     * @param email - почта пользователя
     * @param fullName - ФИО пользователя
     * @param birthDate - дата рождения пользователя
     * @param password - пароль пользователя
     * @param avatar - аватар пользователя (необязательно)
     * @param role - роль, если пользователь регистрируется администратором
     * @param session - текущая Http сессия
     * @return - DTO с данными сохранённого пользователя
     */
    public UserDTO register(
            String email,
            String fullName,
            String birthDate,
            String password,
            MultipartFile avatar,
            String role,
            HttpSession session
    ) {
        if (userRepository.existsByEmail(email)) {
            throw new UserAlreadyExistsException("Пользователь с таким Email уже существует");
        }
        if (userRepository.existsByEmailAndBannedStatusTrue(email)) {
            throw new BannedStatusException("Пользователь с таким Email был заблокирован");
        }
        User user = new User();
        user.setEmail(email);
        user.setFullName(fullName);
        user.setBirthDate(birthDate);
        user.setPassword(password);
        user.setAvatarPath("/uploads/avatars/img.png");
        String finalRole;
        if ("admin".equals(role) || "moder".equals(role) || "user".equals(role)) {
            finalRole = role;
        } else {
            finalRole = "user";
        }
        user.setRole(finalRole);
        user.setVisits(1);
        user.setBannedStatus(false);
        if (avatar != null && !avatar.isEmpty() && !avatar.getOriginalFilename().isEmpty()) {
            try {
                String contentType = avatar.getContentType();
                if (contentType != null && contentType.startsWith("image/")) {
                    String fileName = UUID.randomUUID() + "_" + avatar.getOriginalFilename();
                    Path uploadPath = Paths.get("uploads/avatars");
                    if (!Files.exists(uploadPath)) {
                        Files.createDirectories(uploadPath);
                    }
                    Files.copy(
                            avatar.getInputStream(),
                            uploadPath.resolve(fileName),
                            StandardCopyOption.REPLACE_EXISTING
                    );
                    user.setAvatarPath("/uploads/avatars/" + fileName);
                } else {
                    user.setAvatarPath("/uploads/avatars/img.png");
                }
            } catch (IOException e) {
                e.printStackTrace();
                user.setAvatarPath("/uploads/avatars/img.png");
                throw new RuntimeException("Ошибка сохранения аватара: " + e.getMessage());
            }
        }
        User saved = userRepository.save(user);
        if (role == null || role.isBlank()) {
            session.setAttribute("userId", saved.getId());
        }
        return new UserDTO(saved);
    }

    /**
     * Авторизует пользователя по email и паролю.
     *
     * @param email - введенная почта
     * @param password - введенный пароль
     * @return - UserDto с данными авторизованного пользователя
     */
    public UserDTO login(String email, String password) {
        User user = userRepository.findByEmail(email);
        if (user == null) {
            throw new UserNotFoundException("Такого пользователя не существует");
        }
        if (!user.getPassword().equals(password)) {
            throw new InvalidPasswordException("Неверный пароль");
        }
        if (user.isBannedStatus()) {
            throw new BannedStatusException("Пользователь с таким email был заблокирован");
        }
        user.setVisits(user.getVisits() + 1);
        userRepository.save(user);
        return new UserDTO(user);
    }

    /**
     * Определяет текущего авторизованного пользователя по userId из сессии.
     *
     * @param session - текущая HTTP - сессия
     * @return - UserDto:
     *          - авторизованный пользователь, если userId существует и валиден;
     *          - гость (authenticated = false), если пользователь не найден или userId нет.
     */
    public UserDTO whoAmI(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return new UserDTO();
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return new UserDTO();
        }
        return new UserDTO(user);
    }

    /**
     * Пополняет баланс пользователя на указанную сумму.
     *
     * @param userId - ID пользователя
     * @param amount - сумма для пополнения (должна быть положительной)
     * @return - обновленный баланс пользователя
     */
    public double addBalance(Long userId, double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Сумма пополнения должна быть положительной");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Пользователь не найден"));
        if (user.isBannedStatus()) {
            throw new BannedStatusException("Заблокированный пользователь не может пополнять баланс");
        }
        double newBalance = user.getBalance() + amount;
        user.setBalance(newBalance);
        userRepository.save(user);
        return newBalance;
    }

    /**
     * Пополняет баланс текущего пользователя на фиксированную сумму 10000.
     *
     * @param session - текущая HTTP-сессия
     * @return - обновленный баланс пользователя
     */
    public double addFixedAmountToBalance(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            throw new UserNotFoundException("Пользователь не авторизован");
        }
        return addBalance(userId, 10000.0);
    }

    /**
     * Получает баланс текущего пользователя.
     *
     * @param session - текущая HTTP-сессия
     * @return - баланс пользователя
     */
    public double getBalance(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            throw new UserNotFoundException("Пользователь не авторизован");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Пользователь не найден"));
        return user.getBalance();
    }
}
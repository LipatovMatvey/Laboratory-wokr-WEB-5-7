package ru.AuctionApp.Backend.Service;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import ru.AuctionApp.Backend.Dto.UserDto;
import ru.AuctionApp.Backend.Entity.User;
import ru.AuctionApp.Backend.Exception.BannedStatusException;
import ru.AuctionApp.Backend.Exception.InvalidPasswordException;
import ru.AuctionApp.Backend.Exception.UserAlreadyExistsException;
import ru.AuctionApp.Backend.Exception.UserNotFoundException;
import ru.AuctionApp.Backend.Repository.UserRepository;

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

    @Autowired
    private UserRepository userRepository;

    /**
     * Регистрирует нового пользователя
     * @param email - почта пользователя
     * @param fullName - ФИО пользователя
     * @param birthDate - дата рождения пользователя
     * @param password - пароль пользователя
     * @param avatar - аватар пользователя (необязательно)
     * @param role - роль, если пользователь регистрируется администратором
     * @param session - текущая Http сессия
     * @return - DTO с данными сохранённого пользователя
     */
    public UserDto register(
            String email,
            String fullName,
            String birthDate,
            String password,
            MultipartFile avatar,
            String role,
            HttpSession session
    ) {
        if (userRepository.existsByEmail(email))
            throw new UserAlreadyExistsException("Пользователь с таким Email уже существует");

        User user = new User();
        user.setEmail(email);
        user.setFullName(fullName);
        user.setBirthDate(birthDate);
        user.setPassword(password);
        user.setRole("user");
        user.setVisits(1);

        String finalRole;
        if ("admin".equals(role) || "moder".equals(role) || "user".equals(role)) {
            finalRole = role;
        } else {
            finalRole = "user";
        }

        user.setRole(finalRole);

        if (avatar != null && !avatar.isEmpty()) {
            try {
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

                user.setAvatarPath("/avatars/" + fileName);

            } catch (Exception e) {
                throw new RuntimeException("Ошибка сохранения аватара");
            }
        }

        User savedUser = userRepository.save(user);

        if (role == null || role.isBlank()) {
            session.setAttribute("userId", savedUser.getId());
        }

        return new UserDto(savedUser);
    }


    /**
     * Авторизует пользователя по email и паролю
     * @param email - введенная почта
     * @param password - введенный пароль
     * @return - UserDto с данными авторизованного пользователя
     */
    public UserDto login(String email, String password) {
        User user = userRepository.findByEmail(email);

        if (user == null)
            throw new UserNotFoundException("Такого пользователя не существует");

        if (!user.getPassword().equals(password))
            throw new InvalidPasswordException("Неверный пароль");

        if (userRepository.existsByEmailAndBannedStatusTrue(email))
            throw new BannedStatusException("Пользователь с таким email был заблокирован");

        user.setVisits(user.getVisits() + 1);
        userRepository.save(user);

        return new UserDto(user);
    }

    /**
     * Определяет текущего авторизованного пользователя по userId из сессии
     * @param session текущая HTTP-сессия
     * @return UserDto:
     *          - авторизованный пользователь, если userId существует и валиден;
     *          - гость (authenticated = false), если пользователь не найден или userId нет.
     */
    public UserDto whoAmI(HttpSession session) {

        Long userId = (Long) session.getAttribute("userId");

        if (userId == null) {
            return new UserDto();
        }

        User user = userRepository.findById(userId).orElse(null);

        if (user == null) {
            return new UserDto();
        }

        return new UserDto(user);
    }
}
package ru.AuctionApp.Backend.Controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.AuctionApp.Backend.Entity.User;
import ru.AuctionApp.Backend.Repositories.UsersRepository;
import ru.AuctionApp.Backend.Services.AuthService;

import java.util.Map;

@RestController
@RequestMapping("/api/balance")
public class BalanceController {

    /**
     * Сервис аутентификации, предоставляющий методы для работы с балансом пользователя.
     */
    @Autowired
    private AuthService authService;

    /**
     * Репозиторий для работы с пользователями.
     */
    @Autowired
    private UsersRepository usersRepository;

    /**
     * Обрабатывает исключения типа RuntimeException
     * @param ex исключение RuntimeException, которое было выброшено в методах контроллера
     * @return карта (Map) с ключом "error" и сообщением об ошибке из исключения в качестве значения
     */
    @ExceptionHandler(RuntimeException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleError(RuntimeException ex) {
        return Map.of("error", ex.getMessage());
    }

    /**
     * Получает текущий баланс пользователя.
     * @param session - текущая HTTP-сессия
     * @return - JSON с балансом пользователя
     */
    @GetMapping
    public ResponseEntity<?> getBalance(HttpSession session) {
        try {
            double balance = authService.getBalance(session);
            return ResponseEntity.ok(Map.of(
                    "balance", balance,
                    "message", "Баланс получен успешно"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Пополняет баланс пользователя на фиксированную сумму (10000).
     * @param session - текущая HTTP-сессия
     * @return - JSON с новым балансом
     */
    @PostMapping("/add-fixed")
    public ResponseEntity<?> addFixedAmount(HttpSession session) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }
            User user = usersRepository.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Пользователь не найден"));
            }
            double newBalance = user.getBalance() + 10000.0;
            user.setBalance(newBalance);
            usersRepository.save(user);
            return ResponseEntity.ok(Map.of(
                    "newBalance", newBalance,
                    "message", "Баланс успешно пополнен на 10000"
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка сервера: " + e.getMessage()));
        }
    }

    /**
     * Пополняет баланс пользователя на произвольную сумму
     * @param userId - ID пользователя (для администраторов)
     * @param amount - сумма для пополнения
     * @param session - текущая HTTP-сессия
     * @return - JSON с новым балансом
     */
    @PostMapping("/add/{userId}")
    public ResponseEntity<?> addBalance(
            @PathVariable Long userId,
            @RequestParam double amount,
            HttpSession session
    ) {
        try {
            Long currentUserId = (Long) session.getAttribute("userId");
            if (currentUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }
            if (!currentUserId.equals(userId)) {
                User currentUser = usersRepository.findById(currentUserId).orElse(null);
                if (currentUser == null || !"admin".equals(currentUser.getRole())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Недостаточно прав"));
                }
            }
            User user = usersRepository.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Пользователь не найден"));
            }
            double newBalance = user.getBalance() + amount;
            user.setBalance(newBalance);
            usersRepository.save(user);
            return ResponseEntity.ok(Map.of(
                    "newBalance", newBalance,
                    "message", String.format("Баланс успешно пополнен на %.2f", amount)
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка сервера: " + e.getMessage()));
        }
    }
}
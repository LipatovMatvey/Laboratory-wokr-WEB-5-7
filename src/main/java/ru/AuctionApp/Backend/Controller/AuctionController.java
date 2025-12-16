package ru.AuctionApp.Backend.Controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.AuctionApp.Backend.DTO.AuctionDTO;
import ru.AuctionApp.Backend.Entity.Auction;
import ru.AuctionApp.Backend.Entity.Bid;
import ru.AuctionApp.Backend.Entity.User;
import ru.AuctionApp.Backend.Repositories.AuctionRepository;
import ru.AuctionApp.Backend.Repositories.BidRepository;
import ru.AuctionApp.Backend.Repositories.UsersRepository;
import ru.AuctionApp.Backend.Services.AuctionService;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auctions")
public class AuctionController {

    /**
     * Сервис для работы с аукционами.
     */
    @Autowired
    private AuctionService auctionService;

    /**
     * Репозиторий для работы с аукционами
     */
    @Autowired
    private AuctionRepository auctionRepository;

    /**
     * Репозиторий для работы с пользователями
     */
    @Autowired
    private UsersRepository usersRepository;

    /**
     * Репозиторий для работы со ставками
     */
    @Autowired
    private BidRepository bidRepository;

    /**
     * Обрабатывает исключения типа RuntimeException, возникающие в контроллере.
     * @param ex - исключение, которое было выброшено
     * @return - карта с сообщением об ошибке
     */
    @ExceptionHandler(RuntimeException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleError(RuntimeException ex) {
        return Map.of("error", ex.getMessage());
    }

    /**
     * Создает новый аукцион.
     * @param title - название лота
     * @param description - подробное описание лота
     * @param startPrice - начальная цена лота
     * @param step - минимальный шаг ставки
     * @param startTime - время начала аукциона
     * @param endTime - время окончания аукциона
     * @param category - категория лота
     * @param image - изображение лота (необязательно)
     * @param session - текущая HTTP-сессия для проверки авторизации
     * @return - созданный аукцион или сообщение об ошибке
     */
    @PostMapping(value = "/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createAuction(
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam("startPrice") Double startPrice,
            @RequestParam("step") Double step,
            @RequestParam("startTime") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam("endTime") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam("category") String category,
            @RequestParam(value = "image", required = false) MultipartFile image,
            HttpSession session
    ) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }
            AuctionDTO auction = auctionService.createAuction(
                    title, description, startPrice, step,
                    startTime, endTime, category, image, userId
            );
            return ResponseEntity.ok(auction);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Получает список активных аукционов.
     * @return - список DTO активных аукционов
     */
    @GetMapping("/active")
    public List<AuctionDTO> getActiveAuctions() {
        return auctionService.getActiveAuctions();
    }

    /**
     * Получает информацию об аукционе по его ID.
     * @param id - уникальный идентификатор аукциона
     * @return - DTO аукциона или сообщение об ошибке, если аукцион не найден
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getAuctionById(@PathVariable Long id) {
        try {
            AuctionDTO auction = auctionService.getAuctionById(id);
            return ResponseEntity.ok(auction);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Получает список аукционов, созданных текущим пользователем.
     * @param session - текущая HTTP-сессия для определения пользователя
     * @return - список DTO аукционов пользователя или сообщение об ошибке
     */
    @GetMapping("/my")
    public ResponseEntity<?> getUserAuctions(HttpSession session) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }
            List<AuctionDTO> auctions = auctionService.getUserAuctions(userId);
            return ResponseEntity.ok(auctions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Получает аукционы для главной страницы
     * @return - список DTO аукционов для главной
     */
    @GetMapping("/featured")
    public List<AuctionDTO> getFeaturedAuctions() {
        return auctionService.getFeaturedAuctions();
    }

    /**
     * Получает список завершенных аукционов
     * @return - список DTO завершенных аукционов
     */
    @GetMapping("/completed")
    public List<AuctionDTO> getCompletedAuctions() {
        return auctionService.getCompletedAuctions();
    }

    /**
     * Получает список завершенных аукционов текущего пользователя.
     * @param session - текущая HTTP-сессия для определения пользователя
     * @return - список DTO завершенных аукционов пользователя
     */
    @GetMapping("/my/completed")
    public ResponseEntity<?> getUserCompletedAuctions(HttpSession session) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }
            List<AuctionDTO> allCompletedAuctions = auctionService.getCompletedAuctions();
            List<AuctionDTO> userCompletedAuctions = allCompletedAuctions.stream()
                    .filter(auction -> auction.getCreatorId() != null && auction.getCreatorId().equals(userId))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(userCompletedAuctions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Принудительная проверка и обновление статусов завершенных аукционов
     * @return - результат проверки
     */
    @PostMapping("/check-expired")
    public ResponseEntity<?> checkExpiredAuctions() {
        try {
            int updatedCount = auctionService.checkAndUpdateExpiredAuctions();
            return ResponseEntity.ok(Map.of(
                    "message", "Статусы аукционов обновлены",
                    "updatedCount", updatedCount
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Обновляет аукцион (доступно только администраторам)
     * @param id - ID аукциона
     * @param updates - данные для обновления
     * @param session - HTTP сессия
     * @return - обновленный аукцион
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAuction(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates,
            HttpSession session
    ) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }
            Auction auction = auctionRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Аукцион не найден"));
            User currentUser = usersRepository.findById(userId).orElse(null);
            boolean isAdmin = currentUser != null && "admin".equals(currentUser.getRole());
            if (!isAdmin) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Только администраторы могут редактировать аукционы"));
            }
            boolean wasActive = "ACTIVE".equals(auction.getStatus());
            boolean isFinishing = updates.containsKey("status") && "FINISHED".equals(updates.get("status"));
            if (updates.containsKey("title")) {
                auction.setTitle((String) updates.get("title"));
            }
            if (updates.containsKey("description")) {
                auction.setDescription((String) updates.get("description"));
            }
            if (updates.containsKey("startPrice")) {
                auction.setStartPrice(Double.parseDouble(updates.get("startPrice").toString()));
                if (auction.getCurrentPrice() == null || auction.getCurrentPrice() < auction.getStartPrice()) {
                    auction.setCurrentPrice(auction.getStartPrice());
                }
            }
            if (updates.containsKey("step")) {
                auction.setStep(Double.parseDouble(updates.get("step").toString()));
            }
            if (updates.containsKey("category")) {
                auction.setCategory((String) updates.get("category"));
            }
            if (updates.containsKey("status")) {
                String newStatus = (String) updates.get("status");
                auction.setStatus(newStatus);
                if (wasActive && "FINISHED".equals(newStatus)) {
                    determineWinner(auction);
                }
            }
            auction.setUpdatedAt(LocalDateTime.now());
            Auction updated = auctionRepository.save(auction);
            if (wasActive && isFinishing) {
                refundLosingBidders(auction);
            }
            return ResponseEntity.ok(new AuctionDTO(updated));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Определяет победителя аукциона при ручном завершении
     */
    private void determineWinner(Auction auction) {
        try {
            List<Bid> bids = bidRepository.findByAuctionIdOrderByAmountDesc(auction.getId());
            if (bids != null && !bids.isEmpty()) {
                Bid winningBid = bids.stream()
                        .filter(Bid::isWinning)
                        .findFirst()
                        .orElse(bids.get(0));
                auction.setWinner(winningBid.getUser());
                auction.setCurrentPrice(winningBid.getAmount());
                winningBid.setWinning(true);
                bidRepository.save(winningBid);
                for (Bid bid : bids) {
                    if (!bid.getId().equals(winningBid.getId())) {
                        bid.setWinning(false);
                        bidRepository.save(bid);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Возвращает деньги проигравшим участникам
     */
    private void refundLosingBidders(Auction auction) {
        try {
            List<Bid> bids = bidRepository.findByAuctionIdOrderByAmountDesc(auction.getId());
            if (bids != null && !bids.isEmpty()) {
                Bid winningBid = bids.stream()
                        .filter(Bid::isWinning)
                        .findFirst()
                        .orElse(null);
                for (Bid bid : bids) {
                    if (winningBid == null || !bid.getId().equals(winningBid.getId())) {
                        User user = bid.getUser();
                        user.setBalance(user.getBalance() + bid.getAmount());
                        usersRepository.save(user);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Удаляет завершенный аукцион (только для администраторов)
     * @param id ID аукциона
     * @param session HTTP сессия
     * @return результат удаления
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCompletedAuction(
            @PathVariable Long id,
            HttpSession session
    ) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }

            User currentUser = usersRepository.findById(userId).orElse(null);
            if (currentUser == null || !"admin".equals(currentUser.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Только администраторы могут удалять аукционы"));
            }

            Auction auction = auctionRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Аукцион не найден"));

            // Проверяем, что аукцион завершен
            List<String> completedStatuses = List.of("FINISHED", "EXPIRED", "CANCELLED");
            if (!completedStatuses.contains(auction.getStatus())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Можно удалять только завершенные аукционы"));
            }

            // Удаляем аукцион
            auctionRepository.delete(auction);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Аукцион успешно удален",
                    "deletedAuction", new AuctionDTO(auction)
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка при удалении аукциона: " + e.getMessage()));
        }
    }

    /**
     * Получает список завершенных аукционов для администратора
     * @param session HTTP сессия
     * @return список завершенных аукционов
     */
    @GetMapping("/completed-for-admin")
    public ResponseEntity<?> getCompletedAuctionsForAdmin(HttpSession session) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Не авторизован"));
            }

            User currentUser = usersRepository.findById(userId).orElse(null);
            if (currentUser == null || !"admin".equals(currentUser.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Только администраторы могут просматривать этот список"));
            }

            List<AuctionDTO> completedAuctions = auctionService.getCompletedAuctions();
            return ResponseEntity.ok(completedAuctions);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка при получении списка аукционов: " + e.getMessage()));
        }
    }
}
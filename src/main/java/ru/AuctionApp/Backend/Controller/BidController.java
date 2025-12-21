package ru.AuctionApp.Backend.Controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.AuctionApp.Backend.Services.BidService;

import java.util.Map;

@RestController
@RequestMapping("/api/bids")
public class BidController {

    /**
     * Сервис для выполнения бизнес-логики, связанной со ставками
     */
    @Autowired
    private BidService bidService;

    /**
     * Размещает новую ставку на аукционе
     * @param bidData карта данных ставки, содержащая auctionId и amount
     * @param session HTTP-сессия пользователя для получения идентификатора текущего пользователя
     * @return ResponseEntity с результатом операции
     */
    @PostMapping
    public ResponseEntity<?> placeBid(
            @RequestBody Map<String, Object> bidData,
            HttpSession session
    ) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Необходима авторизация"));
            }
            Long auctionId = Long.valueOf(bidData.get("auctionId").toString());
            Double amount = Double.valueOf(bidData.get("amount").toString());
            Map<String, Object> result = bidService.placeBid(userId, auctionId, amount);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Получает все ставки для указанного аукциона
     * @param auctionId идентификатор аукциона, для которого запрашиваются ставки
     * @return ResponseEntity с данными о ставках
     */
    @GetMapping("/auction/{auctionId}")
    public ResponseEntity<?> getAuctionBids(@PathVariable Long auctionId) {
        try {
            return ResponseEntity.ok(bidService.getAuctionBids(auctionId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Завершает аукцион и выполняет возврат средств всем участникам, кроме победителя
     * @param auctionId идентификатор аукциона, который необходимо завершить
     * @param session HTTP-сессия для проверки авторизации пользователя
     * @return ResponseEntity с результатом операции
     */
    @PostMapping("/finish-auction/{auctionId}")
    public ResponseEntity<?> finishAuction(
            @PathVariable Long auctionId,
            HttpSession session
    ) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Необходима авторизация"));
            }
            bidService.finishAuction(auctionId);
            bidService.refundAllBidsExceptWinner(auctionId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Аукцион завершен"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
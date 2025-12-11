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

    @Autowired
    private BidService bidService;

    /**
     * Создает новую ставку
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
     * Получает историю ставок для аукциона
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
     * Завершает аукцион и возвращает деньги проигравшим (для администратора)
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
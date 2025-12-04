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
import ru.AuctionApp.Backend.Services.AuctionService;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auctions")
public class AuctionController {

    @Autowired
    private AuctionService auctionService;

    @ExceptionHandler(RuntimeException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleError(RuntimeException ex) {
        return Map.of("error", ex.getMessage());
    }

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

    @GetMapping("/active")
    public List<AuctionDTO> getActiveAuctions() {
        return auctionService.getActiveAuctions();
    }

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
}
package ru.AuctionApp.Backend.DTO;

import lombok.Data;
import ru.AuctionApp.Backend.Entity.Auction;
import java.time.LocalDateTime;

@Data
public class AuctionDTO {
    private Long id;
    private String title;
    private String description;
    private Double startPrice;
    private Double currentPrice;
    private Double step;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String imageUrl;
    private String category;
    private String status;
    private Integer bidsCount;
    private LocalDateTime createdAt;
    private String creatorName;
    private Long creatorId;

    public AuctionDTO(Auction auction) {
        this.id = auction.getId();
        this.title = auction.getTitle();
        this.description = auction.getDescription();
        this.startPrice = auction.getStartPrice();
        this.currentPrice = auction.getCurrentPrice();
        this.step = auction.getStep();
        this.startTime = auction.getStartTime();
        this.endTime = auction.getEndTime();
        this.imageUrl = auction.getImageUrl();
        this.category = auction.getCategory();
        this.status = auction.getStatus();
        this.bidsCount = auction.getBidsCount();
        this.createdAt = auction.getCreatedAt();
        this.creatorId = auction.getCreator() != null ? auction.getCreator().getId() : null;
        this.creatorName = auction.getCreator() != null ? auction.getCreator().getFullName() : "Система";
    }
}
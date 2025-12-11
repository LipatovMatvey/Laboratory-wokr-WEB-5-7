package ru.AuctionApp.Backend.DTO;

import lombok.Data;
import ru.AuctionApp.Backend.Entity.Auction;
import java.time.LocalDateTime;

@Data
public class AuctionDTO {
    /**
     * Идентификатор аукциона.
     */
    private Long id;

    /**
     * Название аукциона.
     */
    private String title;

    /**
     * Подробное описание лота.
     */
    private String description;

    /**
     * Начальная цена лота.
     */
    private Double startPrice;

    /**
     * Текущая цена лота (последняя ставка).
     */
    private Double currentPrice;

    /**
     * Минимальный шаг ставки.
     */
    private Double step;

    /**
     * Время начала аукциона.
     */
    private LocalDateTime startTime;

    /**
     * Время окончания аукциона.
     */
    private LocalDateTime endTime;

    /**
     * URL-адрес изображения лота.
     */
    private String imageUrl;

    /**
     * Категория лота (например, "электроника", "искусство").
     */
    private String category;

    /**
     * Статус аукциона ("ACTIVE", "FINISHED", "CANCELLED").
     */
    private String status;

    /**
     * Количество сделанных ставок.
     */
    private Integer bidsCount;

    /**
     * Дата и время создания аукциона.
     */
    private LocalDateTime createdAt;

    /**
     * Имя создателя аукциона.
     */
    private String creatorName;

    /**
     * Идентификатор создателя аукциона.
     */
    private Long creatorId;

    /**
     * Конструктор по умолчанию
     */
    public AuctionDTO(){
        this.id = null;
        this.title = null;
        this.description = null;
        this.startPrice = null;
        this.currentPrice = null;;
        this.step = null;
        this.startTime = null;
        this.endTime = null;
        this.imageUrl = null;
        this.category = null;
        this.status = null;
        this.bidsCount = null;
        this.createdAt = null;
        this.creatorId = null;
        this.creatorName = null;
    }

    /**
     * Конструктор с параметром
     * @param auction
     */
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
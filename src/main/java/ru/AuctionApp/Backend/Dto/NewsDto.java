package ru.AuctionApp.Backend.Dto;

import lombok.Data;
import ru.AuctionApp.Backend.Entity.News;

@Data
public class NewsDto {
    /**
     * Id
     */
    private Long id;
    /**
     * Заголовок новости
     */
    private String title;
    /**
     * Содержимое новости
     */
    private String content;
    /**
     * Дата создания
     */
    private String creatingDate;
    /**
     * Автор новости
     */
    private String createdBy;

    /**
     * Конструктор с параметром
     * @param n Объект класса News
     */
    public NewsDto(News n) {
        this.id = n.getId();
        this.title = n.getTitle();
        this.content = n.getContent();
        this.creatingDate = n.getCreatingDate();
        this.createdBy = n.getCreatedBy();
    }

    /**
     * Конструктор по умолчанию
     */
    public NewsDto() {
        this.id = null;
        this.title = "NoTitle";
        this.content = "NoContent";
        this.creatingDate = "NoDate";
        this.createdBy = "NoAuthor";
    }
}

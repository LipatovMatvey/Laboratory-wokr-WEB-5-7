package ru.AuctionApp.Backend.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "news")
public class News {
    @Id
    @Column(name = "id", nullable = false)
    private Long id;
    private String news_header;
    private String news_body;
    private String creating_date;
    private String created_by;
    private String image_path;
}
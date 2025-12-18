package ru.AuctionApp.Backend.Services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import ru.AuctionApp.Backend.DTO.NewsDTO;
import ru.AuctionApp.Backend.Entity.News;
import ru.AuctionApp.Backend.Repositories.NewsRepository;

import java.util.List;

@Service
public class NewsService {

    @Autowired
    private NewsRepository newsRepository;

    /**
     * Возвращает список всех новостей, отсортированных по ID по убыванию.
     * @return список новостей в формате DTO
     */
    public List<NewsDTO> getAllNews() {
        return newsRepository.findAllByOrderByIdDesc().stream()
                .map(NewsDTO::new)
                .toList();
    }

    /**
     * Создает новую новость
     * @param news_header заголовок новости
     * @param news_body содержимое новости
     * @param creating_date дата создания
     * @param created_by автор
     * @return список, содержащий одну созданную новость в формате DTO
     */
    public List<NewsDTO> addNews(String news_header, String news_body, String creating_date, String created_by) {
        News news = new News();
        news.setTitle(news_header);
        news.setContent(news_body);
        news.setCreatingDate(creating_date);
        news.setCreatedBy(created_by);

        News saved = newsRepository.save(news);

        return List.of(new NewsDTO(saved));
    }

    /**
     * Обновляет существующую новость
     * @param id id новости
     * @param news_header новый заголовок
     * @param news_body новое содержимое новости
     * @return список с обновлённой DTO новости
     */
    public List<NewsDTO> updateNews(long id, String news_header, String news_body) {

        News news = newsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Новость не найдена"));

        news.setTitle(news_header);
        news.setContent(news_body);

        News savedNews = newsRepository.save(news);

        return List.of(new NewsDTO(savedNews));
    }

    /**
     * Метод для получения содержимого новости
     * @param newsId Id новости
     * @return Список с DTO новости
     */
    public List<NewsDTO> getNews(Long newsId) {
        News news = newsRepository.findById(newsId).orElseThrow(() -> new RuntimeException("Новость не найдена"));
        return List.of(new NewsDTO(news));
    }

    /**
     * Метод для нахождения новости по ее заголовку
     * @param title Заголовок
     * @return true - новость с таким заголовком существует, иначе - false
     */
    public boolean alreadyExistsTitle(String title) {
        News news = newsRepository.findByTitle(title);
        return news != null;
    }

    /**
     * Метод для нахождения новости по ее тексту
     * @param content Текст новости
     * @return true - новость с таким текстом существует, иначе - false
     */
    public boolean alreadyExistsContent(String content) {
        News news = newsRepository.findByContent(content);
        return news != null;
    }
}
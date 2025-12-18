package ru.AuctionApp.Backend.Controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import ru.AuctionApp.Backend.DTO.NewsDTO;
import ru.AuctionApp.Backend.Entity.News;
import ru.AuctionApp.Backend.Entity.User;
import ru.AuctionApp.Backend.Repository.NewsRepository;
import ru.AuctionApp.Backend.Repositories.UsersRepository;
import ru.AuctionApp.Backend.Service.NewsService;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/news")
public class NewsController {
    @Autowired
    NewsService newsService;
    @Autowired
    UsersRepository userRepository;

    @Autowired
    private NewsRepository newsRepository;

    /**
     * Возвращает список всех новостей
     * @return Список DTO новостей
     */
    @GetMapping
    public List<NewsDTO> getAllNews() {
        return newsService.getAllNews();
    }

    /**
     * Метод добавления новости
     * @param title Заголовок
     * @param content Содержимое новости
     * @return Обновленный список новостей
     */
    @PostMapping
    public List<NewsDTO> addNews(
            @RequestParam("title") String title,
            @RequestParam("content") String content,
            HttpSession session
    ) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        if (newsService.alreadyExistsTitle(title)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Новость с таким заголовком уже существует");
        }

        if (newsService.alreadyExistsContent(content)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Новость с таким текстом уже существует");
        }

        validationNews(title, content);

        return newsService.addNews(title, content, LocalDate.now().toString(), user.getFullName());
    }

    /**
     * Метод получения информации о новости по ее Id
     * @param newsId Id новости
     * @return Список с DTO новости
     */
    @PostMapping("/getInfo")
    public List<NewsDTO> getNews(@RequestParam("id") Long newsId) {
        return newsService.getNews(newsId);
    }

    @PostMapping("/update")
    public List<NewsDTO> updateNews(@RequestParam("title") String title,
                                    @RequestParam("content") String content,
                                    @RequestParam("id") Long id,
                                    HttpSession session
    ) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        if (!user.getRole().equals("admin") && !user.getRole().equals("moder")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        if (newsService.alreadyExistsTitle(title) && newsService.alreadyExistsContent(content)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Такая новость уже существует");
        }

        validationNews(title, content);

        return newsService.updateNews(id, title, content);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNews(@PathVariable Long id, HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Не авторизован"));
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null || (!"admin".equals(user.getRole()) && !"moder".equals(user.getRole()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Доступ запрещен"));
        }

        News news = newsRepository.findById(id).orElse(null);
        if (news == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Такой новости не существует"));
        }

        newsRepository.delete(news);
        return ResponseEntity.ok(Map.of("message", "Новость успешно удалена"));
    }

    /**
     * Метод валидации данных новости
     * @param content Тело новости
     * @param title Заголовок
     */
    public void validationNews(String title, String content) {

        if (title.isEmpty() || content.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Заголовок и текст новости не могут быть пустыми");
        }

        if (title.length() > 65) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Максимальная длина заголовка - 65 символов");
        }

        if (content.length() > 5000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Максимальная длина текста - 5000 символов");
        }
    }
}
package ru.AuctionApp.Backend.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * Технический контроллер для получения текущего серверного времени и даты.
 * Используется клиентом для отображения точного времени и синхронизации
 * с сервером, чтобы избежать зависимости от локального времени на устройстве пользователя.
 */
@RestController
@RequestMapping("/api")
public class ServerTimeController {
    /**
     * Возвращает текущее серверное время в формате HH:mm:ss.
     * @return карта с текущим временем сервера
     */
    @GetMapping("/time")
    public Map<String, String> getTime() {
        LocalTime now = LocalTime.now();
        String time = now.format(DateTimeFormatter.ofPattern("HH:mm:ss"));
        return Map.of("time", time);
    }

    /**
     * Возвращает текущую серверную дату и время.
     * @return - карта, содержащая текущее LocalDateTime сервера
     */
    @GetMapping("/getServerDate")
    public Map<String, LocalDateTime> getDate() {
        Map<String, LocalDateTime> response = new HashMap<>();
        response.put("date", LocalDateTime.now());
        return response;
    }
}
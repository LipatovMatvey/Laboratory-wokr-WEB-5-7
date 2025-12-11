package ru.AuctionApp.Backend.Exception;

public class BannedStatusException extends RuntimeException {
    /**
     * Конструктор исключения с сообщением об ошибке
     * @param message сообщение об ошибке
     */
    public BannedStatusException(String message) { super(message); }
}
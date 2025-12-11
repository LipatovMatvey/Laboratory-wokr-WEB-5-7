package ru.AuctionApp.Backend.Exception;


public class UserAlreadyExistsException extends RuntimeException {
    /**
     * Конструктор исключения с сообщением об ошибке
     * @param message сообщение об ошибке
     */
    public UserAlreadyExistsException(String message) { super(message); }
}
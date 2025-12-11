package ru.AuctionApp.Backend.Exception;

public class InvalidPasswordException extends RuntimeException{
    /**
     * Конструктор исключения с сообщением об ошибке
     * @param message сообщение об ошибке
     */
    public InvalidPasswordException(String message) { super(message); }
}
package ru.AuctionApp.Backend.Exception;

public class InvalidPasswordException extends RuntimeException{
    /**
     *
     * @param message
     */
    public InvalidPasswordException(String message) { super(message); }
}
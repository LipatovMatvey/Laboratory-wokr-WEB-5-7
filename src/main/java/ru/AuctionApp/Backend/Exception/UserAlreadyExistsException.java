package ru.AuctionApp.Backend.Exception;


public class UserAlreadyExistsException extends RuntimeException {
    /**
     *
     * @param message
     */
    public UserAlreadyExistsException(String message) { super(message); }
}
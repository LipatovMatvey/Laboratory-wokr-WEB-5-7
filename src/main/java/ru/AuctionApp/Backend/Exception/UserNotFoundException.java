package ru.AuctionApp.Backend.Exception;

public class UserNotFoundException extends RuntimeException {
    /**
     *
     * @param message
     */
    public UserNotFoundException(String message) { super(message); }
}
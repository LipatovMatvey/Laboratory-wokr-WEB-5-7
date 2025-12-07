package ru.AuctionApp.Backend.Exception;

public class BannedStatusException extends RuntimeException {
    /**
     *
     * @param message
     */
    public BannedStatusException(String message) { super(message); }
}
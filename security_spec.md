# Security Specification: Live Stock & Dividend Tracker

## Data Invariants
1. A Purchase or Dividend cannot exist without a valid `stockId` that belongs to the same user.
2. Users can only read and write their own data.
3. Every document ID must be valid and conform to size limits.
4. Timestamps should be validated where applicable.

## The Dirty Dozen (Attack Vectors)
1. **Unauthorized Access**: User A tries to read User B's portfolio.
2. **Identity Spoofing**: User A tries to create a stock doc under User B's UID.
3. **Ghost Field Injection**: Adding `isAdmin: true` to a Stock document.
4. **ID Poisoning**: Using a 2KB string as a `stockId`.
5. **Orphaned Writes**: Creating a Purchase with a non-existent `stockId`.
6. **Negative Quantity**: Creating a Purchase with `-100` shares.
7. **Zero Price**: Creating a Purchase with `0` price to skew averages.
8. **Invalid Date**: Using "2025-13-45" as a purchase date.
9. **Tax Evasion**: Setting `net` > `gross` in a Dividend record.
10. **Resource Exhaustion**: Sending an array of 5,000 "notes" tags.
11. **Future Dating**: Setting a `purchaseDate` in the year 2099.
12. **Cross-User Relational Hijack**: User A creates a Dividend record pointing to User B's Stock ID.

## The Test Runner (Plan)
We will implement security rules that block all the above.
Check for `request.auth.uid == userId` for all paths.
Validate data types and sizes in `isValid[Entity]` helpers.
Check for existence of `stockId` in `purchases` and `dividends` using `exists()`.

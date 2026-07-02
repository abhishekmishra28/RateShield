Today I implemented the Token Bucket algorithm.

Key concepts learned:

- Bucket Capacity
- Refill Rate
- Lazy Refill
- Burst Handling

The algorithm allows short traffic bursts while maintaining a fixed average request rate over time.

Instead of continuously refilling tokens, I used lazy refill by calculating the number of tokens to add whenever a request arrives.
import {
  ProviderOperationError,
  runWithProviderResilience,
} from "./provider-resilience";

describe("provider resilience", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("retries a transient provider error only three times", async () => {
    jest.useFakeTimers();
    const error = new ProviderOperationError("temporary failure", 503);
    const operation = jest.fn().mockRejectedValue(error);

    const assertion = expect(runWithProviderResilience(operation)).rejects.toBe(
      error,
    );
    await jest.advanceTimersByTimeAsync(400);

    await assertion;
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("does not retry a provider rejection", async () => {
    const error = new ProviderOperationError("invalid request", 400);
    const operation = jest.fn().mockRejectedValue(error);

    await expect(runWithProviderResilience(operation)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

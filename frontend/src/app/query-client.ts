import { QueryClient } from "@tanstack/react-query";

interface QueryErrorLike {
  status?: number;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const queryError = error as QueryErrorLike | undefined;
        // Do not retry 401, 403, or 404
        if (queryError?.status === 401 || queryError?.status === 403 || queryError?.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

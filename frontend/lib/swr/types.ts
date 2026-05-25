export type ApiError = {
	message: string;
	status: number;
	info?: unknown;
};

export type SwrResponse<T> = {
	data: T | undefined;
	error: ApiError | undefined;
	isLoading: boolean;
	isValidating: boolean;
	mutate: () => void;
};

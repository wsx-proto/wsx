export const isNumericString = (message: string) =>
	message.trim().length !== 0 && !Number.isNaN(Number(message))

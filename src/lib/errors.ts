const ERROR_MESSAGES: Record<string, string> = {
  INVALID_NAME: 'Introduce un nombre válido.',
  INVALID_DESCRIPTION: 'Introduce una descripción.',
  INVALID_AMOUNT: 'Introduce un importe válido.',
  INVALID_DATE: 'Introduce una fecha válida.',
  NO_PARTICIPANTS: 'Selecciona al menos un usuario.',
  DUPLICATE_PARTICIPANT: 'Hay usuarios repetidos.',
  PARTICIPANT_NOT_ACTIVE: 'Todos los participantes deben estar activos.',
  INVALID_INITIAL_PAYMENT: 'Hay un pago inicial no válido.',
  INITIAL_PAYMENTS_EXCEED_EXPENSE: 'Los pagos iniciales superan el importe del gasto.',
  USER_NOT_ACTIVE: 'Ese usuario ya no está activo.',
  USER_NOT_FOUND: 'No se ha encontrado el usuario.',
  EXPENSE_NOT_FOUND: 'No se ha encontrado el gasto.',
  PAYMENT_NOT_FOUND: 'No se ha encontrado el pago.',
  PAYMENT_EXCEEDS_EXPENSE: 'El total de pagos no puede superar el importe del gasto.',
  EXPENSE_ALREADY_PAID: 'El gasto ya está completamente pagado.',
  INVALID_RECURRENCE_END: 'La fecha límite debe ser igual o posterior a la fecha del gasto.',
  RECURRENCE_NOT_FOUND: 'No se ha encontrado la recurrencia.'
};

export function friendlyError(error: unknown): string {
  const message = typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '';
  const match = Object.keys(ERROR_MESSAGES).find((code) => message.includes(code));
  if (match) return ERROR_MESSAGES[match];
  return 'No se ha podido completar la operación. Comprueba la conexión e inténtalo de nuevo.';
}

// Rental Contact API client
import { httpClient } from './httpClient';

// Minimal types inferred from backend controller names
export interface RentalContact {
  id: number;
  rentalOrderId: number;
  content?: string;
  status?: string | number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RentalContactCreateDTO {
  rentalOrderId: number;
  content?: string;
}

export interface RentalContactUpdateDTO {
  id: number;
  content?: string;
}

export const rentalContactApi = {
  // GET /api/RentalContact
  getAll: () => httpClient<RentalContact[]>('/RentalContact'),

  // GET /api/RentalContact/byRentalOrder/{rentalOrderId}
  getByRentalOrderId: (rentalOrderId: number) =>
    httpClient<RentalContact | RentalContact[] | null>(`/RentalContact/byRentalOrder/${rentalOrderId}`),

  // POST /api/RentalContact
  create: (dto: RentalContactCreateDTO) =>
    httpClient<string | { message: string }>(`/RentalContact`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  // PUT /api/RentalContact
  update: (dto: RentalContactUpdateDTO) =>
    httpClient<string | { message: string }>(`/RentalContact`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),

  // DELETE /api/RentalContact/{id}
  delete: (id: number) =>
    httpClient<string | { message: string }>(`/RentalContact/${id}`, {
      method: 'DELETE',
    }),
};

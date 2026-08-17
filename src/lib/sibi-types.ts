// src/lib/sibi-types.ts

// Based on SIBI API response observation
export namespace SIBI {
    export interface Book {
        id: string;
        book_type: string;
        code: string;
        title: string;
        writer: string | null;
        publisher: string;
        tags: string | null;
        level: string;
        description: string;
        cover: string;
        image: string; // cover thumbnail
        isbn: string | null;
        price_zone_1: number;
        price_zone_2: number;
        price_zone_3: number;
        price_zone_4: number;
        price_zone_5A: number;
        price_zone_5B: number;
        attachment: string; // PDF url
        total_page: number | null;
        publish_date: string; // "YYYY-MM-DD"
        source_book: string;
        status: string;
        created_at: string; // ISO 8601
        updated_at: string; // ISO 8601
        created_by: string | null;
        updated_by: string | null;
        book_id: string | null;
    }
}

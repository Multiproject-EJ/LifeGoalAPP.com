-- Migration script for annual reviews
CREATE TABLE annual_reviews (
    id SERIAL PRIMARY KEY,
    review_date DATE NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

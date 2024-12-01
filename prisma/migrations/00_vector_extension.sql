-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create cosine similarity function
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 1 - (a <=> b);
END;
$$;

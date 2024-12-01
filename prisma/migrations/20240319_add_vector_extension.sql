-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a function to calculate cosine similarity
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 1 - (a <=> b);
END;
$$;

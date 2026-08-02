const OpenAI = require("openai");
const sequelize = require('../db');

let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

/**
 * Generates a string representation of the database schema for the AI.
 * @returns {string} A description of all models and their attributes.
 */
function getModelsSchema() {
    const schema = [];
    const modelNames = Object.keys(sequelize.models);

    schema.push(`DB Schema (PostgreSQL): The following tables are available: ${modelNames.join(', ')}.`);

    for (const modelName of modelNames) {
        const model = sequelize.models[modelName];
        const tableName = model.getTableName();
        const attributes = model.rawAttributes;

        const columnDescriptions = Object.keys(attributes).map(attr => {
            const attribute = attributes[attr];
            const type = attribute.type.constructor.name;
            const details = [
                `type: ${type}`,
                attribute.primaryKey && 'PK',
                attribute.allowNull === false && 'NOT NULL',
                attribute.references && `FK to ${attribute.references.model}(${attribute.references.key})`
            ].filter(Boolean).join(', ');
            return `${attr} (${details})`;
        }).join('; ');

        schema.push(`- Table "${tableName}" has columns: ${columnDescriptions}.`);
    }
    return schema.join('\n');
}

/**
 * Asks Gemini to generate a secure, read-only SQL query from a natural language question.
 * @param {string} question - The user's question.
 * @param {string} dbSchema - The database schema description.
 * @returns {Promise<string>} The generated SQL query.
 */
async function generateSqlQuery(question, dbSchema) {
    const prompt = `
        Based on the database schema below, write a single, valid PostgreSQL SQL query to answer the user's question.
        - Your response MUST be ONLY the SQL query. Do not include any other text, explanation, or markdown formatting like \`\`\`sql.
        - You are strictly forbidden from generating any write operations (INSERT, UPDATE, DELETE, DROP, ALTER, etc.).
        - You MUST only generate read-only queries (SELECT).
        - For time-based queries like "last 30 days", use constructions like "createdAt" >= NOW() - INTERVAL '30 days'. The "createdAt" column is a timestamp with timezone.
        - Always enclose table and column names in double quotes to handle case sensitivity (e.g., "grocery_orders", "createdAt").

        Schema:
        ---
        ${dbSchema}
        ---

        User Question: "${question}"

        SQL Query:
    `;

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Explicitly using a highly cost-effective and capable model.
        messages: [{ role: "user", content: prompt }],
        temperature: 0, // Set to 0 for deterministic and predictable SQL output
        max_tokens: 250,
        n: 1,
    });

    let sqlQuery = completion.choices[0].message.content.trim();
    sqlQuery = sqlQuery.replace(/```sql/g, '').replace(/```/g, '').replace(/;/g, '').trim();

    if (!sqlQuery) {
        throw new Error('AI failed to generate a SQL query.');
    }
    if (!sqlQuery.toLowerCase().trim().startsWith('select')) {
        throw new Error('Security risk: Generated query is not a read-only SELECT statement.');
    }

    return sqlQuery;
}

/**
 * Asks OpenAI to format raw database results into a plain text answer.
 * @param {string} question - The original user question.
 * @param {Array<Object>} queryResult - The data from the database.
 * @returns {Promise<string>} The generated text response.
 */
async function generateTextResponse(question, queryResult) {
    const prompt = `
        The user asked: "${question}".
        A SQL query was run and returned this data in JSON format:
        ---
        ${JSON.stringify(queryResult, null, 2)}
        ---
        Based on this data, provide a concise and clear answer to the user's question in plain text.
        - Your response MUST be ONLY the plain text answer.
        - Do not include any markdown, HTML, or any other formatting.
        - currency must be INR.
        - Summarize the findings and present the key information directly as a natural language response.
    `;

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5, // Allow for some creativity in summarization
        max_tokens: 500,
    });

    const textResponse = completion.choices[0].message.content.trim();
    return textResponse;
}

/**
 * Main controller to handle natural language queries via Gemini.
 * POST /api/ask-pintu/query
 */
exports.askQuestion = async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ success: false, message: 'Question is required.' });
    }

    if (!openai) {
        return res.status(500).json({ success: false, message: 'OpenAI API key is not configured on the server.' });
    }

    try {
        // Step 1: Get the database schema to provide context to the AI
        const dbSchema = getModelsSchema();

        // Step 2: Generate a secure SQL query from the user's question
        const sqlQuery = await generateSqlQuery(question, dbSchema);

        // Step 3: Execute the generated SQL query against the database
        const [queryResult] = await sequelize.query(sqlQuery, {
            type: sequelize.QueryTypes.SELECT
        });

        // Step 4: Handle cases where the query returns no data
        if (queryResult.length === 0) {
            return res.status(200).json({
                success: true,
                text: "I ran the query successfully, but it returned no results for your question.",
                sql: sqlQuery
            });
        }

        // Step 5: Generate a user-friendly text response from the query results
        const textResponse = await generateTextResponse(question, queryResult);

        // Step 6: Send the final HTML report to the client
        res.status(200).json({
            success: true,
            text: textResponse,
            sql: sqlQuery // Also send the generated SQL for debugging/transparency
        });

    } catch (error) {
        console.error('Error in askPintu controller:', error);
        // Provide a more user-friendly error message
        const userMessage = error.message.includes('Security risk')
            ? 'The generated query was not safe to execute.'
            : 'An error occurred while processing your question.';
        res.status(500).json({ success: false, message: userMessage, details: error.message });
    }
};

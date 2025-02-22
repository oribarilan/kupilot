# Best Practices for Kusto Query Language Queries

## Reduce the Data Processed
- Use the `where` operator to limit the amount of data being processed.
- Reference only necessary tables, avoid using `*` in the `union` operator.
- Apply filters (`where`) immediately after referencing tables.
- Order predicates by selectivity:
  1. Whole-shard predicates like `extent_id()`.
  2. Datetime column filters.
  3. String and dynamic column filters.
  4. Numeric column filters.

## Avoid Redundant Qualified References
- Use unqualified names for local entities, such as `T` instead of `cluster("<serviceURL>").database("DB").T`. This makes the query easier to read and perform better.

## Use Efficient Operators
- For strings, prefer `has` over `contains`.
- For case-sensitive comparisons, use `==` instead of `=~`.
- Avoid case-insensitive comparisons unless necessary.
- Use `in` for matching specific values rather than `in~`.
- When looking for rare keys in dynamic objects, filter with `has` before parsing the JSON.

## Optimize Joins
- For joins, place the smaller table first (left-most).
- Use `hint.strategy=broadcast` if the left side is small and the right side is large.
- If the right side is small, use `lookup` instead of `join`.

## Use Materialized Views and `materialize()`
- Use materialized views for commonly used aggregations.
- Apply filters or select specific columns before using the `materialize()` function to reduce the dataset.

## Miscellaneous Tips
- For datetime columns, use the `datetime` type instead of converting `long` values.
- Use the `parse` operator for extracting values from columns with similar string patterns.
- For new queries, use `limit` or `count` to avoid returning large datasets unintentionally.

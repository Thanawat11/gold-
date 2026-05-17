package com.ekhuaheng.goldshop.config;

import com.ekhuaheng.goldshop.entity.PaymentMethod;
import com.ekhuaheng.goldshop.entity.ProductStatus;
import com.ekhuaheng.goldshop.entity.Role;
import com.ekhuaheng.goldshop.entity.TransactionStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DatabaseSchemaMaintenance {

    private final DataSource dataSource;

    @Bean
    CommandLineRunner maintainDatabaseSchema() {
        return args -> {
            if (!isPostgreSql()) {
                return;
            }
            syncProductStatusConstraint();
            syncPaymentMethodConstraints();
            syncTransactionStatusConstraint();
            syncRoleConstraint();
        };
    }

    private boolean isPostgreSql() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.getMetaData()
                    .getDatabaseProductName()
                    .toLowerCase(Locale.ROOT)
                    .contains("postgresql");
        } catch (Exception e) {
            throw new IllegalStateException("Unable to inspect database type", e);
        }
    }

    private void syncProductStatusConstraint() {
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        if (!tableExists(jdbcTemplate, "products")) {
            return;
        }

        String allowedStatuses = Arrays.stream(ProductStatus.values())
                .map(ProductStatus::name)
                .collect(Collectors.joining("','", "'", "'"));

        if (columnExists(jdbcTemplate, "products", "status")) {
            syncCheckConstraint(jdbcTemplate, "products", "status", "products_status_check", allowedStatuses);
        }
        log.info("Synchronized products.status check constraint for statuses: {}", allowedStatuses);
    }

    private void syncPaymentMethodConstraints() {
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        String allowedMethods = Arrays.stream(PaymentMethod.values())
                .map(PaymentMethod::name)
                .collect(Collectors.joining("','", "'", "'"));

        if (tableExists(jdbcTemplate, "transactions") && columnExists(jdbcTemplate, "transactions", "payment_method")) {
            syncCheckConstraint(jdbcTemplate, "transactions", "payment_method", "transactions_payment_method_check", allowedMethods);
        }
        if (tableExists(jdbcTemplate, "transaction_payments") && columnExists(jdbcTemplate, "transaction_payments", "payment_method")) {
            syncCheckConstraint(jdbcTemplate, "transaction_payments", "payment_method", "transaction_payments_payment_method_check", allowedMethods);
        }
        log.info("Synchronized payment method check constraints for methods: {}", allowedMethods);
    }

    private void syncTransactionStatusConstraint() {
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        if (!tableExists(jdbcTemplate, "transactions") || !columnExists(jdbcTemplate, "transactions", "status")) {
            return;
        }

        String allowedStatuses = Arrays.stream(TransactionStatus.values())
                .map(TransactionStatus::name)
                .collect(Collectors.joining("','", "'", "'"));

        syncCheckConstraint(jdbcTemplate, "transactions", "status", "transactions_status_check", allowedStatuses);
        log.info("Synchronized transactions.status check constraint for statuses: {}", allowedStatuses);
    }

    private void syncRoleConstraint() {
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        if (!tableExists(jdbcTemplate, "users") || !columnExists(jdbcTemplate, "users", "role")) {
            return;
        }

        String allowedRoles = Arrays.stream(Role.values())
                .map(Role::name)
                .collect(Collectors.joining("','", "'", "'"));

        syncCheckConstraint(jdbcTemplate, "users", "role", "users_role_check", allowedRoles);
        log.info("Synchronized users.role check constraint for roles: {}", allowedRoles);
    }

    private boolean tableExists(JdbcTemplate jdbcTemplate, String tableName) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = current_schema()
                      AND table_name = ?
                )
                """, Boolean.class, tableName);
        return Boolean.TRUE.equals(exists);
    }

    private boolean columnExists(JdbcTemplate jdbcTemplate, String tableName, String columnName) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = ?
                      AND column_name = ?
                )
                """, Boolean.class, tableName, columnName);
        return Boolean.TRUE.equals(exists);
    }

    private void syncCheckConstraint(
            JdbcTemplate jdbcTemplate,
            String tableName,
            String columnName,
            String constraintName,
            String allowedValues
    ) {
        List<String> constraints = jdbcTemplate.queryForList("""
                SELECT con.conname
                FROM pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
                JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                WHERE nsp.nspname = current_schema()
                  AND rel.relname = ?
                  AND con.contype = 'c'
                  AND pg_get_constraintdef(con.oid) ILIKE ?
                """, String.class, tableName, "%" + columnName + "%");

        constraints.forEach(constraint ->
                jdbcTemplate.execute("ALTER TABLE " + quoteIdentifier(tableName) + " DROP CONSTRAINT IF EXISTS " + quoteIdentifier(constraint)));

        jdbcTemplate.execute("ALTER TABLE " + quoteIdentifier(tableName)
                + " ADD CONSTRAINT " + quoteIdentifier(constraintName)
                + " CHECK (" + quoteIdentifier(columnName) + " IN (" + allowedValues + "))");
    }

    private String quoteIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }
}

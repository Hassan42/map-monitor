package com.example.mapmonitor.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

// stores EventCategory as its name, like @Enumerated(STRING) - but Hibernate doesn't know the enum's
// values here, so it adds no check constraint listing them (which ddl-auto=update never updates,
// so every new category would be rejected by the database)
@Converter
public class EventCategoryConverter implements AttributeConverter<EventCategory, String> {

    @Override
    public String convertToDatabaseColumn(EventCategory category) {
        return category == null ? null : category.name();
    }

    @Override
    public EventCategory convertToEntityAttribute(String value) {
        return value == null ? null : EventCategory.valueOf(value);
    }
}

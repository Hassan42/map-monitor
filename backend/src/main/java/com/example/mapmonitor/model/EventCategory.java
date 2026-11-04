package com.example.mapmonitor.model;

public enum EventCategory {
    DEATH,
    ECONOMIC_DEVELOPMENT,
    ELECTION,
    // battles
    ATTACK,
    CAPTURE,
    MARITIME_ATTACK,
    PLANE_CRASH,
    // explosions / remote violence
    EXPLOSION,
    AIR_STRIKE,
    CHEMICAL_WEAPON,
    DRONE_ATTACK,
    GRENADE,
    ONE_WAY_DRONE,
    IED,
    SHELLING_ARTILLERY_MISSILE_ATTACK,
    // political announcement
    AGREEMENT,
    ARRESTS,
    CHANGE_TO_GROUP,
    HEADQUARTERS_ESTABLISHED,
    NON_VIOLENT_TERRITORY_TRANSFER,
    OPERATION,
    LEGISLATION,
    // protests
    PEACEFUL_PROTEST,
    VIOLENT_PROTEST,
    // violence against civilians
    ABDUCTION,
    ATTACK_ON_CIVILIANS,
    LOOTING,
    PROPERTY_DESTRUCTION,
    // natural disasters
    STORM,
    EARTHQUAKE,
    OTHER
}

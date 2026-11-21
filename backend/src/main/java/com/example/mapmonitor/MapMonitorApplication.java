package com.example.mapmonitor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MapMonitorApplication {

    public static void main(String[] args) {
        SpringApplication.run(MapMonitorApplication.class, args);
    }

}

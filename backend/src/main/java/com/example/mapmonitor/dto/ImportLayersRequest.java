package com.example.mapmonitor.dto;

import java.util.List;

public record ImportLayersRequest(Long sourceMapId, List<Long> layerIds) {

}

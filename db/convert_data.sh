#!/bin/bash
# Convert add_data.sql to use correct table names for the simulator system

# This script converts:
# - LaunchMonitors -> simulator_launch_monitors
# - Projectors -> simulator_projectors
# - HittingMats -> simulator_hitting_mats

if [ -f "/opt/golfapp/add_data.sql" ]; then
    INPUT_FILE="/opt/golfapp/add_data.sql"
    OUTPUT_FILE="/opt/golfapp/add_data_converted.sql"
else
    echo "Error: /opt/golfapp/add_data.sql not found"
    exit 1
fi

echo "Converting table names in $INPUT_FILE..."

# Use sed to replace table names (case-insensitive)
sed -e 's/INSERT INTO LaunchMonitors/INSERT INTO simulator_launch_monitors/gi' \
    -e 's/INSERT INTO Projectors/INSERT INTO simulator_projectors/gi' \
    -e 's/INSERT INTO HittingMats/INSERT INTO simulator_hitting_mats/gi' \
    "$INPUT_FILE" > "$OUTPUT_FILE"

echo "Converted file saved to: $OUTPUT_FILE"
echo ""
echo "Now run:"
echo "  psql postgresql://golftest:testpass123@localhost:5432/golfos_test -f $OUTPUT_FILE"

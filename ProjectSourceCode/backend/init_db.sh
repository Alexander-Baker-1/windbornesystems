#!/bin/bash
# DO NOT PUSH THIS FILE TO GITHUB
# This file contains sensitive information and should be kept private
# TODO: Set your PostgreSQL URI - Use the External Database URL from the Render dashboard
PG_URI="postgresql://db_vaan_user:bK7hnTYdwtRKEfHcC915wBL0Gg1Ic6Fx@dpg-d0fr32re5dus73f5q810-a.oregon-postgres.render.com/db_vaan"
# Execute each .sql file in the directory
for file in src/init_data/*.sql; do
    echo "Executing $file..."
    psql $PG_URI -f "$file"
done
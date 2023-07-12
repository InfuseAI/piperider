import csv
import os


def create_csv_file(file_path, file_size_mb):
    row_size = 1024  # 1KB row size
    rows_per_mb = int((1024 * 1024) / row_size)
    target_rows = rows_per_mb * file_size_mb

    headers = [f'Column{i}' for i in range(1, 65)]  # Generate headers from Column1 to Column64

    with open(file_path, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(headers)  # Write the header row
        for _ in range(target_rows):
            writer.writerow(['Sample data'] * 64)  # Writing a row with sample data for 64 columns

    # Check if the file has reached the target size
    while os.path.getsize(file_path) < (file_size_mb * 1024 * 1024):
        with open(file_path, 'a', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['Sample data'] * 64)  # Writing additional rows until the target size is reached


# Example usage
file_path = 'seeds/sample.csv'
file_size_mb = 2
create_csv_file(file_path, file_size_mb)
print(f"CSV file '{file_path}' created with a size of {file_size_mb}MB.")

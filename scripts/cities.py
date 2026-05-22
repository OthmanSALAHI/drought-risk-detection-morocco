import pandas as pd

df = pd.read_csv("data/worldcities.csv")

# print(df.columns.to_list())

df = df[df["country"] == "Morocco"][["country", "city", "lat", "lng"]]


df.to_csv("data/moroccan_cities.csv", index=False)

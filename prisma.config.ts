// @ts-ignore
import { defineConfig } from "prisma/config";

export default defineConfig({
  migrate: {
    datasource: "db",
    datasourceUrl: process.env.DATABASE_URL!,
  },
});

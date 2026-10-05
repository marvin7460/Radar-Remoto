-- Full-text search over jobs with SQLite FTS5 (Turso/libSQL ship it).
-- External-content table: the text lives in `jobs`, FTS keeps only the index.
-- unicode61 + remove_diacritics: "mexico" matches "México", case-insensitive.
CREATE VIRTUAL TABLE `jobs_fts` USING fts5(
	title, company, technologies, description,
	content='jobs', content_rowid='id',
	tokenize='unicode61 remove_diacritics 2'
);
--> statement-breakpoint
-- Ranking: a hit in the title is worth 10× a hit in the description.
INSERT INTO `jobs_fts`(`jobs_fts`, `rank`) VALUES ('rank', 'bm25(10.0, 4.0, 6.0, 1.0)');
--> statement-breakpoint
INSERT INTO `jobs_fts`(rowid, title, company, technologies, description)
	SELECT id, title, company, technologies, description FROM `jobs`;
--> statement-breakpoint
CREATE TRIGGER `jobs_fts_after_insert` AFTER INSERT ON `jobs` BEGIN
	INSERT INTO `jobs_fts`(rowid, title, company, technologies, description)
	VALUES (new.id, new.title, new.company, new.technologies, new.description);
END;
--> statement-breakpoint
CREATE TRIGGER `jobs_fts_after_delete` AFTER DELETE ON `jobs` BEGIN
	INSERT INTO `jobs_fts`(`jobs_fts`, rowid, title, company, technologies, description)
	VALUES ('delete', old.id, old.title, old.company, old.technologies, old.description);
END;
--> statement-breakpoint
CREATE TRIGGER `jobs_fts_after_update` AFTER UPDATE OF title, company, technologies, description ON `jobs` BEGIN
	INSERT INTO `jobs_fts`(`jobs_fts`, rowid, title, company, technologies, description)
	VALUES ('delete', old.id, old.title, old.company, old.technologies, old.description);
	INSERT INTO `jobs_fts`(rowid, title, company, technologies, description)
	VALUES (new.id, new.title, new.company, new.technologies, new.description);
END;

CREATE TABLE todos (
    todo_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('stock', 'photo', 'video', 'checkbox') NOT NULL,
    schedule ENUM('daily', 'weekly', 'monthly', 'single') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by BIGINT NOT NULL,

    -- Scheduling
    due_time TIME NULL COMMENT 'Time of day the todo is due',
    start_date DATE NULL COMMENT 'When the todo becomes active',
    end_date DATE NULL COMMENT 'When the todo expires',
    day_of_week TINYINT NULL COMMENT '1=Monday, 7=Sunday (weekly only)',
    day_of_month TINYINT NULL COMMENT '1-31 (monthly only)',

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,


    INDEX idx_schedule (schedule),
    INDEX idx_active (is_active)
);

CREATE TABLE todo_completions (
    completion_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    todo_id BIGINT NOT NULL,
    completed_by BIGINT NOT NULL,
    completion_date DATE NOT NULL,

    -- Type-specific fields
    ppc INT NULL COMMENT 'Pieces Per Cycle (stock type)',
    wp INT NULL COMMENT 'Work Progress (stock type)',
    super INT NULL COMMENT 'Supervisor count or score (stock type)',
    checkbox_status BOOLEAN NULL COMMENT 'Checked state (checkbox type only)',
    remarks TEXT DEFAULT NULL,

    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_todo_completion_todo
        FOREIGN KEY (todo_id) REFERENCES todos(todo_id) ON DELETE CASCADE,

    -- Allow multiple completions per todo per user per date
    INDEX idx_todo_user_date (todo_id, completed_by, completion_date),
    INDEX idx_completion_date (completion_date),
    INDEX idx_completed_by (completed_by)
);

CREATE TABLE todo_completion_files (
    file_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    completion_id BIGINT NOT NULL,
    file_type ENUM('photo', 'video') NOT NULL COMMENT 'Type of media attached',
    file_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_completion_file
        FOREIGN KEY (completion_id) REFERENCES todo_completions(completion_id) ON DELETE CASCADE,

    INDEX idx_completion (completion_id)
);

CREATE TABLE todo_locations (
    todo_location_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    todo_id BIGINT NOT NULL,
    location_id BIGINT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_todo_location_todo
        FOREIGN KEY (todo_id) REFERENCES todos(todo_id) ON DELETE CASCADE,

    -- Prevent duplicate active location mappings for same todo
    UNIQUE KEY uq_todo_location (todo_id, location_id),

    INDEX idx_todo_location_todo (todo_id),
    INDEX idx_todo_location_location (location_id),
    INDEX idx_todo_location_deleted (is_deleted)
);

ALTER TABLE `todo_completions` ADD `todo_location_id` BIGINT NOT NULL COMMENT 'Which location this completion was done at' AFTER `todo_id`;


ALTER TABLE todos
ADD COLUMN checkbox_items JSON NULL AFTER description;


ALTER TABLE todo_completions
ADD COLUMN checkbox_items_response JSON NULL AFTER `super`;

ALTER TABLE todo_completions DROP checkbox_status;

ALTER TABLE todos ADD last_reminder_sent_at TIMESTAMP NULL;


ALTER TABLE `todo_completions` ADD `cnt_ppc` DECIMAL(10,2) NOT NULL DEFAULT '0.00' AFTER `super`, ADD `cnt_wp` DECIMAL(10,2) NOT NULL DEFAULT '0.00' AFTER `cnt_ppc`, ADD `cnt_super` DECIMAL(10,2) NOT NULL DEFAULT '0.00' AFTER `cnt_wp`, ADD `week` DECIMAL(10,2) NOT NULL DEFAULT '0.00' AFTER `cnt_super`;


ALTER TABLE `todo_completions` CHANGE `ppc` `ppc` DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Pieces Per Cycle (stock type)', CHANGE `wp` `wp` DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Work Progress (stock type)', CHANGE `super` `super` DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Supervisor count or score (stock type)';

ALTER TABLE `todo_completions` CHANGE `week` `week` TEXT NULL;

ALTER TABLE `todos` ADD `is_ocr` BOOLEAN NULL AFTER `schedule`;

ALTER TABLE `todo_completions`
  DROP `ppc`,
  DROP `wp`,
  DROP `super`,
  DROP `cnt_ppc`,
  DROP `cnt_wp`,
  DROP `cnt_super`,
  DROP `week`;


  CREATE TABLE todo_completion_items (
    todo_completion_item_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    completion_id BIGINT NOT NULL,

    stock_name ENUM(
        'ppc',
        'wp',
        'super',
        'cnt_ppc',
        'cnt_wp',
        'cnt_super'
    ) NOT NULL,

    stock_value DECIMAL(10,2) NOT NULL,

    week INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_todo_completion_items_completion
        FOREIGN KEY (completion_id)
        REFERENCES todo_completions(completion_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
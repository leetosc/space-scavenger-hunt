"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@space-scavenger-hunt/ui/components/popover";
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";

import { ICON_MAP, SPACE_ICONS } from "@/lib/icons";
import { staggerContainer, popIn, iconButtonInteraction } from "@/lib/animations";

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const SelectedIcon = ICON_MAP[value];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <motion.button
            type="button"
            className="flex items-center justify-center size-8 border border-border/40 hover:border-cyan-400 transition-colors"
            title={value || "Choose icon"}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
          />
        }
      >
        {SelectedIcon ? (
          <SelectedIcon className="size-4 text-cyan-400" />
        ) : (
          <span className="text-xs text-muted-foreground">?</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <motion.div
          className="grid grid-cols-7 gap-1.5"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {SPACE_ICONS.map(({ name, icon: Icon }) => (
            <motion.button
              key={name}
              type="button"
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className={cn(
                "flex items-center justify-center p-1.5 border transition-all",
                "hover:border-cyan-400 hover:text-cyan-400",
                value === name
                  ? "border-cyan-400 text-cyan-400 bg-cyan-400/10"
                  : "border-border/40 text-muted-foreground",
              )}
              title={name}
              variants={popIn}
              {...iconButtonInteraction}
            >
              <Icon className="size-4" />
            </motion.button>
          ))}
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}

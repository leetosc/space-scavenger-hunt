"use client";
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

export const FileUpload = ({
  onChange,
}: {
  onChange?: (files: File[]) => void;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    onChange && onChange(newFiles);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple: false,
    noClick: true,
    onDrop: handleFileChange,
    onDropRejected: (error) => {
      console.log(error);
    },
  });

  return (
    <div className="w-full" {...getRootProps()}>
      <motion.div
        onClick={handleClick}
        whileHover="animate"
        className="group/file relative block w-full cursor-pointer overflow-hidden rounded-lg p-10"
      >
        <input
          ref={fileInputRef}
          id="file-upload-handle"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
        />

        {/* Space background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/80 to-slate-950 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <SpacePattern />
        </div>

        {/* Nebula glow effects */}
        <div className="absolute top-0 left-1/4 h-32 w-32 rounded-full bg-cyan-500/10 blur-[60px]" />
        <div className="absolute bottom-0 right-1/4 h-24 w-24 rounded-full bg-indigo-500/15 blur-[50px]" />

        {/* Scanning line on drag */}
        {isDragActive && (
          <motion.div
            className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            initial={{ top: "0%" }}
            animate={{ top: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        )}

        <div className="flex flex-col items-center justify-center">
          <p className="relative z-20 font-mono text-sm font-bold tracking-wider text-cyan-300 uppercase">
            Transmit photo evidence
          </p>
          <p className="relative z-20 mt-2 text-sm font-normal text-indigo-300/70">
            Drag & drop or click to select from device
          </p>
          <div className="relative mx-auto mt-10 w-full max-w-xl">
            {files.length > 0 &&
              files.map((file, idx) => (
                <motion.div
                  key={"file" + idx}
                  layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                  className={cn(
                    "relative z-40 mx-auto mt-4 flex w-full flex-col items-start justify-start overflow-hidden rounded-md border border-cyan-500/20 bg-slate-900/90 p-4 backdrop-blur-sm md:h-24",
                    "shadow-[0_0_15px_rgba(6,182,212,0.15)]",
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-4">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="max-w-xs truncate text-base text-cyan-100"
                    >
                      {file.name}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="w-fit shrink-0 rounded-lg border border-indigo-500/20 bg-indigo-950/50 px-2 py-1 font-mono text-sm text-indigo-300"
                    >
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </motion.p>
                  </div>

                  <div className="mt-2 flex w-full flex-col items-start justify-between text-sm text-indigo-300/60 md:flex-row md:items-center">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="rounded-md border border-cyan-500/10 bg-cyan-950/30 px-1 py-0.5 font-mono text-xs"
                    >
                      {file.type}
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="font-mono text-xs"
                    >
                      modified{" "}
                      {new Date(file.lastModified).toLocaleDateString()}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            {!files.length && (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  "relative z-40 mx-auto mt-4 flex h-32 w-full max-w-[8rem] items-center justify-center rounded-md border border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm group-hover/file:shadow-[0_0_20px_rgba(6,182,212,0.3)]",
                  "shadow-[0_0_15px_rgba(6,182,212,0.1)]",
                )}
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center font-mono text-sm text-cyan-400"
                  >
                    Drop it
                    <IconUpload className="h-4 w-4 text-cyan-400" />
                  </motion.p>
                ) : (
                  <motion.div
                    animate={{
                      y: [0, -4, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <IconUpload className="h-5 w-5 text-cyan-400" />
                  </motion.div>
                )}
              </motion.div>
            )}

            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className="absolute inset-0 z-30 mx-auto mt-4 flex h-32 w-full max-w-[8rem] items-center justify-center rounded-md border border-dashed border-cyan-400/40 bg-transparent opacity-0"
              ></motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export function SpacePattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex shrink-0 scale-105 flex-wrap items-center justify-center gap-x-px gap-y-px bg-slate-950">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          const isStar = index % 17 === 0 || index % 31 === 0;
          return (
            <div
              key={`${col}-${row}`}
              className={cn(
                "flex h-10 w-10 shrink-0 rounded-[2px]",
                isStar
                  ? "bg-cyan-400/10 shadow-[0_0_4px_rgba(6,182,212,0.3)]"
                  : index % 2 === 0
                    ? "bg-slate-950"
                    : "bg-indigo-950/30 shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]",
              )}
            />
          );
        }),
      )}
    </div>
  );
}

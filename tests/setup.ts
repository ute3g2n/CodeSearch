import "@testing-library/jest-dom/vitest";
import "@testing-library/react";

// Tauri API のモック（テスト環境では window.__TAURI__ が存在しない）
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

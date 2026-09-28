module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: { country: "#EDE7F9", tile: "#C8DAEF", ink: "#29486E", graphite: "#242428", sunshine: "#F5D779", charcoal: "#3A3A40", cocoa: "#4E3222" },
    },
  },
  plugins: [],
};

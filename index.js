#!/usr/bin/env node

import { cpus as _cpus, totalmem, freemem, platform, release } from "os";
import { exec } from "child_process";
import chalk from "chalk";
import inquirer from "inquirer";
import figlet from "figlet";
import blessed from "blessed";
import contrib from "blessed-contrib";

function bytesToGB(bytes) {
  return (bytes / (1024 * 1024 * 1024)).toFixed(2);
}

const alertThresholds = {
  cpuUsage: 80,
  memoryUsage: 80,
  networkTraffic: 100,
};

function checkPerformanceThresholds(
  cpuUsage,
  usedMemoryPercentage,
  networkSpeed
) {
  if (
    cpuUsage > alertThresholds.cpuUsage ||
    usedMemoryPercentage > alertThresholds.memoryUsage ||
    networkSpeed > alertThresholds.networkTraffic
  ) {
    console.error(chalk.red.bold("System is overloaded! Shutting down..."));
    process.exit(1);
  }
}

function displayPerformanceStatistics() {
  setInterval(() => {
    const cpus = _cpus();
    const cpuUsage = cpus.map((cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return 100 - (100 * idle) / total;
    });

    const usedCores = cpuUsage.filter((usage) => usage > 0).length;

    exec("wmic process get ProcessId", (error, stdout) => {
      if (error) {
        console.error(chalk.red(`Error: ${error.message}`));
        return;
      }
      const numberOfProcesses = stdout.split("\n").length - 2;

      const totalMemory = bytesToGB(totalmem());
      const usedMemory = bytesToGB(totalmem() - freemem());
      const usedMemoryPercentage =
        ((totalmem() - freemem()) / totalmem()) * 100;

      exec("wmic NIC where NetEnabled=true get Name,Speed", (error, stdout) => {
        if (error) {
          console.error(chalk.red(`Error: ${error.message}`));
          return;
        }
        const lines = stdout.trim().split("\n");
        lines.shift();
        lines.forEach((line) => {
          const [name, speed] = line.trim().split(/\s{2,}/);
          console.log(
            chalk.yellow(
              `Network Usage (${name}): ${chalk.white(`${speed.trim()} Mbps`)}`
            )
          );
        });
      });

      process.stdout.write("\x1Bc");
      console.log(
        chalk.green(
          `Operating System: ${chalk.white(platform())} ${chalk.white(
            release()
          )}`
        )
      );
      console.log(
        chalk.blue(`CPU Usage: ${chalk.white(`${cpuUsage[0].toFixed(2)}%`)}`)
      );
      console.log(
        chalk.yellow(`Number of Cores Used: ${chalk.white(usedCores)}`)
      );
      console.log(
        chalk.magenta(
          `Number of Processes Running: ${chalk.white(numberOfProcesses)}`
        )
      );
      console.log(
        chalk.cyan(
          `Memory Used: ${chalk.white(
            `${usedMemory}GB / ${totalMemory}GB`
          )} (${chalk.white(`${usedMemoryPercentage.toFixed(2)}%`)})`
        )
      );

      checkPerformanceThresholds(cpuUsage[0], usedMemoryPercentage, 0);
    });
  }, 1000);
}

function visualizeCPUUsage() {
  const screen = blessed.screen();
  const line = contrib.line({
    style: {
      line: "yellow",
      text: "green",
      baseline: "black",
    },
    xLabelPadding: 3,
    xPadding: 5,
    label: "CPU Usage (%)",
  });

  screen.append(line); // Append our line to the screen

  screen.key(["escape", "q"], function (ch, key) {
    screen.destroy();
    startPerformanceMonitor();
  });

  const data = {
    x: [],
    y: [],
  };

  // Update the data every second
  setInterval(() => {
    const currentTime = new Date().toLocaleTimeString();
    const cpus = _cpus();
    const cpuUsage = cpus.map((cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return 100 - (100 * idle) / total;
    });
    data.x.push(currentTime);
    data.y.push(cpuUsage[0]);
    line.setData([data]);
    screen.render();
  }, 1000);
}

function setThresholdValues() {
  inquirer
    .prompt([
      {
        type: "input",
        name: "cpuUsage",
        message: "Set CPU Usage Threshold (Default 80%):",
      },
      {
        type: "input",
        name: "memoryUsage",
        message: "Set Memory Usage Threshold (Defualt 80%):",
      },
      {
        type: "input",
        name: "networkTraffic",
        message: "Set Network Traffic Threshold (Default 100 Mbps):",
      },
    ])
    .then((answers) => {
      alertThresholds.cpuUsage = parseFloat(answers.cpuUsage);
      alertThresholds.memoryUsage = parseFloat(answers.memoryUsage);
      alertThresholds.networkTraffic = parseFloat(answers.networkTraffic);
      console.log(chalk.green("Threshold values updated successfully!"));
      startPerformanceMonitor();
    });
}

startPerformanceMonitor();

function startPerformanceMonitor() {
  figlet("Server Utils", function (err, data) {
    if (err) {
      console.log("Something went wrong...");
      console.dir(err);
      return;
    }
    console.log(chalk.yellow(data));

    const menuChoices = [
      "Realtime Reporting",
      "Set Threshold Values",
      "Visualize CPU Usage",
      "Exit",
    ];

    inquirer
      .prompt([
        {
          type: "list",
          name: "menu",
          message: "Server Utils Menu",
          choices: menuChoices,
        },
      ])
      .then((answers) => {
        if (answers.menu === "Realtime Reporting") {
          displayPerformanceStatistics();
        } else if (answers.menu === "Set Threshold Values") {
          setThresholdValues();
        } else if (answers.menu === "Visualize CPU Usage") {
          visualizeCPUUsage();
        } else if (answers.menu === "Exit") {
          process.exit(0);
        }
      });
  });
}

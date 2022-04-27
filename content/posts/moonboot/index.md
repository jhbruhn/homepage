+++
title = "Moonboot"
date = "2022-04-27"
description = "Bare-metal Bootloader Framework for Rust"
tags = [
    "rust",
    "bootloader",
    "fota",
    "firmware",
    "moonboot"
    ]
+++

Updating firmware on embedded devices is hard, if you are not running on some kind of operating system which can manage different applications:

You have to receive the update via some communication path, ideally verifying its integrity and authenticity, store it somewhere and then give control to some instance to replace the currently running application with the newly received version.
And if something goes wrong there, you want to prevent your device from bricking by having an ability to revert to the previous firmware!

The common solution for these situations, where you have some firmware running bare-metal on the embedded system, is to include a bootloader which takes care of updating.

## Upgrades on Embedded Devices

To allow upgrading of the way updates are downloaded (especially if doing Over-the-Air updates!), the download algorithm should be implemented in the application, not in the bootloader.
This bootloader usually only serves the task of exchanging one firmware version A, stored in memory, with some other firmware B, stored somewhere else in memory:

{{< figure src="./banks.png" title="Memory split into different banks" alt="Memory of a device split into three sections: Bootloader, Firmware A and Firmware B" >}}

## Bootloader tasks


With that structure, there are two options of choosing which firmware to execute:
* Either the firmwares support relative addressing/ are linked absolutely against the location they are stored in, thus the bootloader just jumps to whichever firmware it wants to execute, or 
* the firmwares are both linked absolutely against the same origin address, and the bootloader moves whichever firmware is to be executed into the bank they are linked against.

Because Position-Independent Code is uncommon in embedded firmware and providing different versions of the same firmware with different origin addresses is unhandy, the second option is more practical.

To achieve such a system, your firmware project needs the following:

* Firmware which is linked to the appropriate address depending on the memorybanks
* A Bootloader to exchange the firmwares
* A way to communicate between firmware and bootloader to signal updates and results from updates
* A fallback mechanism in case the exchange operation fails


## Moonboot

To make things easier, I wrote a Rust library called [moonboot](https://github.com/jhbruhn/moonboot), a framework to build a bank-exchanging bootloader.

The library abstracts away all the devices hardware and implements the exchange-algorithm for the bootloader.
Additionally, a way to communicate between the application and bootloader is provided by use of a shared RAM section (although the abstractions also allow this to be replaced).

As the memory-bank configuration is used in the bootloaders and applications code, and also required for linker scripts, functions to generate said linker scripts are included.
These functions also generate the reserved sections for the RAM-communication-channel.

This allows the project to have a memory configuration written in Rust-Code, based on which all other code is configured/ generated. Let's dive in!

### Structure

Your project should follow a specific structure to allow for different bootloader and application binaries, and also share the same configuration.

```
workspace/
 ├─application/
 │  └─...
 ├─bootloader/
 │  └─...
 ├─board/
 │  └─...
 └─common/
    └─...

```

**`application`** contains your usual firmware binary implementation.

**`bootloader`** is the binary project for the bootloader which is implemented using moonboot.

**`board`** is a board-supported-crate for your specific hardware. 
Abstracting the hardware drivers away is generally a good idea, and comes in handy for this structure, as the hardware-drivers will be used by both the application and the bootloader.

**`common`** contains the memory-bank configuration in code. This will be used by the application and bootloader, both during build (if linker scripts are generated in the `build.rs`), and during runtime.

### Configuration

To configure a moonboot bootloader, you need a memory bank configuration and a hardware abstraction.

#### Memory

`common/src/lib.rs` contains only some pub const structs.
```rust
use moonboots::{
    hardware::{Bank, Config, LinkerConfig, MemoryUnit},
    Address,
};
pub const FLASH_START: Address = 0x8000000;
pub const FLASH_SIZE: Address = 256 * 1024;
const RAM_START: Address = 0x20000000;
const RAM_SIZE: Address = 160 * 1024;

const BOOTLOADER_SIZE: Address = 32 * 1024;
const BANK_SIZE: Address = (FLASH_SIZE - BOOTLOADER_SIZE) / 2;

pub const CONFIG: Config = Config {
    bootloader_bank: Bank {
        location: 0,
        size: BOOTLOADER_SIZE,
        memory_unit: MemoryUnit::Internal,
    },
    boot_bank: Bank {
        location: BOOTLOADER_SIZE,
        size: BANK_SIZE,
        memory_unit: MemoryUnit::Internal,
    },
    update_bank: Bank {
        location: BOOTLOADER_SIZE + BANK_SIZE,
        size: BANK_SIZE,
        memory_unit: MemoryUnit::Internal,
    },
    ram_bank: Bank {
        location: 0,
        size: RAM_SIZE,
        memory_unit: MemoryUnit::Internal,
    },
};

pub const LINKER_CONFIG: LinkerConfig = LinkerConfig {
    flash_origin: FLASH_START,
    ram_origin: RAM_START,
    has_ram_state: true,
};
```

There is a **`Config`** struct to configure the memory banks, and also a **`LinkerConfig`**.
Note that the origin addresses/locations in the `Config` struct are zero-indexed.
The actual start address of the memory region is given in the `LinkerConfig`, in this case for a STM32L4 micocontroller.

The config specifies four banks:
1. `bootloader_bank` is the bank the bootloader will be stored in. This has to be in the memory location the device starts execution from!
2. `boot_bank` is the bank containing the application to be executed in a normal scenario.
3. `update_bank` will contain any updates the bootloader is supposed to apply.
4. `ram_bank` specifies the RAM section the firmware of the device will use. Usually this is all the RAM. Using this information, the communication channel between bootloader and application can be configured.

Having this configuration in a central code location has several advantages:
* We make less mistakes by not having to manually synchronize multiple occurences of these common values.
* We can do arithmetic operations and thus can for example easily calculate the size of the banks with a fixed size for the bootloader.

#### Linker Scripts

Using this configuration, the linker scripts (`memory.x`) can easily be generated for both the application and the bootloader using the `moonboot_codegen` crate:

`bootloader/build.rs:`

```rust
use std::env;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;

fn main() {
    // Put `memory.x` in our output directory and ensure it's
    // on the linker search path.
    let out = &PathBuf::from(env::var_os("OUT_DIR").unwrap());
    File::create(out.join("memory.x"))
        .unwrap()
        .write_all(
            moonboot_codegen::linker::generate_bootloader_script(
                common::CONFIG,
                common::LINKER_CONFIG,
            )
            .as_bytes(),
        )
        .unwrap();
    println!("cargo:rustc-link-search={}", out.display());
}
```

`application/build.rs:`

```rust
use std::env;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;

fn main() {
    // Put `memory.x` in our output directory and ensure it's
    // on the linker search path.
    let out = &PathBuf::from(env::var_os("OUT_DIR").unwrap());
    File::create(out.join("memory.x"))
        .unwrap()
        .write_all(
            moonboot_codegen::linker::generate_application_script(
                common::CONFIG,
                common::LINKER_CONFIG,
            )
            .as_bytes(),
        )
        .unwrap();
    println!("cargo:rustc-link-search={}", out.display());
}
```

The two `build.rs` files call the respective `generate_bootloader_script` or `generate_application_script` methods from the crate and write that script into a location where the linker can find it.
If you want to take a look at the resulting script, you can find it in the `OUT_DIR` directory in the target dir.

### Bootloader Binary

As all of the logic for the bootloader is implemnted in the moonboot library, the bootloaders main function consists of very little code lines:

`bootloader/src/main.rs:`

```rust
let board = board::Board::take();

let internal_memory = board.flash;
let state = moonboot::state::ram::RamState;
let processor = moonboot::hardware::processor::cortex_m::CortexM::new();

let mut boot = moonboot::MoonbootBoot::<_, _, _, { common::INTERNAL_PAGE_SIZE }>::new(
    common::CONFIG,
    internal_memory,
    state,
    processor,
);

boot.boot().unwrap();

unreachable!();
```
The Exchange logic is abstracted away into the `MoonbootBoot` struct.
To initialize the bootloader, we need four parameters:
The memory-bank config, read/write access to internal memory, an implementation of `moonboot::state::State` providing the communication channel between application and bootloader, and an implementation of `moonboot::hardware::processor::Processor` which provides a method to jump to an application at a specific memory address.

In this case, the code expects some `board::Board` struct which contains all board specific hardware.
From that, moonboot takes a `board.flash` element, which is an abstraction over the internal flash, implementing the [`embedded_storage::Storage`](https://docs.rs/embedded-storage/latest/embedded_storage/trait.Storage.html) trait to provide read and write access over the whole internal memory range. This provides the `internal_memory` component.

The communication channel in this case is using the aforementioned RAM-based implementation, which is provided with moonboot.

As this example is using a `cortex-m` based MCU, the included `CortexM` implementation of `Processor` is used (requires the `cortex-m` feature for moonboot).

Additionally a `PAGE_SIZE` const generic parameter is required for efficient operation of the exchange operation.

After the `MoonshineBoot` is initialzed, you just need to call `boot()` and the rest is happening automatically.

### Application Binary

To access the `update_bank` and shared communication channel to the bootloader, and jump to the bootloader when an update was downloaded, moonboot provides the `MoonbootManager` struct:

`bootloader/src/main.rs:`

```rust
let board = board::Board::take();

let internal_memory = board.flash;
let state = moonboot::state::ram::RamState;
let processor = moonboot::hardware::processor::cortex_m::CortexM::new();

let mut manager =
   moonboot::MoonbootManager::<_, _, _, { common::INTERNAL_PAGE_SIZE }>::new(
        common::CONFIG,
        internal_memory,
        state,
        processor,
   );

```

The initialization is the same as for the `MoonbootBoot` struct.
This struct provides two interesting methods:
First of all, after a successful boot, you must mark it as successful. Otherwise, upon the next boot, the bootloader will restore the previous firmware version. This is to prevent bricking the device through faulty updates:
```rust
manager.mark_boot_as_successful();
```

Downloading updates is easy as well.
The `MoonbootManager` implements the [`embedded_storage::Storage`](https://docs.rs/embedded-storage/latest/embedded_storage/trait.Storage.html) trait.
Writing to that storage writes/reads directly to/from the `update_bank`.
If you need the `update_bank` as a slice, for example to verify a signature, you may use `as_ref(&self) -> &[u8]` function implemented by the Manager.

To finally apply an update, just call:
```rust
manager.update();
```

The Manager will automatically set the right signals via the state implementation and jump to the bootloader.
The bootloader reads those signals and starts the exchange operation.
Afterwards the bootloader stores that an updates has just been applied.
If the application does not boot successfully and/or does not call `mark_boot_as_successful()`, said signal is not removed.
Thus the bootloader knows whether to restore the old firmware version if it get's started the next time (i.e. through a reset after a HardFault).

### Custom Processor

Currently only an implementation for CortexM CPUs with a `VTOR` register is included.
For other processors, for example RISC-V, a different implementation will be needed.
To do so, implement the `moonboot::hardware::processor::Processor` trait which defines the logic to jump to a specific address.
The setup fn is called once at initialization, for example to set up an MPU.
The do_jump fn will be called to jump to either the bootloader or the application location:

```rust
impl Processor for CortexM {
    fn do_jump(&mut self, address: super::Address) -> ! {
        unsafe {
            // Set Vector Table to new vector table (unsafe but okay here)
            (*cortex_m::peripheral::SCB::ptr()).vtor.write(address);

            cortex_m::asm::bootload(address as *const u32);
        }
    }

    fn setup(&mut self, config: &crate::hardware::Config) {
        // Nothing to do!
    }
}
```

### Custom Communication
To implement a custom communication channel, implement the `moonboot::state::State` trait:
```rust
pub trait State {
    /// Read the shared state
    fn read(&mut self) -> MoonbootState;
    /// Write the new state to the shared state
    fn write(&mut self, data: MoonbootState) -> Result<(), ()>;
}
```

`MoonbootState` can be serialized to binary for example by using serde (if the according feature is enabled), or utilizing the Desse functions if the `ram-state` feature is enabled.

## Finish Line

You're done! You now have a bootloader based on moonboot which allows you to write a firmware update to internal memory, and apply it on demand.
Some recommendations from here:
* If you acquire updates from a potentially untrusted channel, do signature checks of your updates.
* In addition to that, prevent replay attacks by only allowing upgrades, not downgrades (in version numbers)
* The IETF SUIT standard is a very good reference for that.

If something is not working right or you need more documentation, please [file an issue](https://github.com/jhbruhn/moonboot/issues).
